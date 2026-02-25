import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { EmailAlreadyExistsError, InvalidCredentialsError, InvalidTokenError, UserNotFoundError } from './auth.errors.js';
import { hashPassword, verifyPassword } from './auth.utils.js';

type AuthTokenPayload = {
  sub: string;
  email: string;
};

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

class AuthService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  get #secret(): Uint8Array {
    return new TextEncoder().encode(this.#services.config.jwt.secret);
  }

  register = async (input: { email: string; password: string }): Promise<AuthResponse> => {
    const db = await this.#database.getInstance();

    const existing = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', input.email)
      .executeTakeFirst();

    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();

    await db
      .insertInto('users')
      .values({
        id,
        email: input.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const token = await this.#createToken({ sub: id, email: input.email });

    return {
      token,
      user: { id, email: input.email, createdAt: now },
    };
  };

  login = async (input: { email: string; password: string }): Promise<AuthResponse> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', input.email)
      .executeTakeFirst();

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const token = await this.#createToken({ sub: user.id, email: user.email });

    return {
      token,
      user: { id: user.id, email: user.email, createdAt: user.created_at },
    };
  };

  verifyToken = async (token: string): Promise<AuthTokenPayload> => {
    try {
      const { payload } = await jwtVerify(token, this.#secret);
      return {
        sub: payload.sub as string,
        email: payload.email as string,
      };
    } catch {
      throw new InvalidTokenError();
    }
  };

  getMe = async (userId: string): Promise<AuthUser> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .select(['id', 'email', 'created_at'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new InvalidCredentialsError();
    }

    return { id: user.id, email: user.email, createdAt: user.created_at };
  };

  listUsers = async (): Promise<AuthUser[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('users')
      .select(['id', 'email', 'created_at'])
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({ id: row.id, email: row.email, createdAt: row.created_at }));
  };

  changePassword = async (input: { userId: string; currentPassword: string; newPassword: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .select(['id', 'password_hash'])
      .where('id', '=', input.userId)
      .executeTakeFirst();

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(input.currentPassword, user.password_hash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db
      .updateTable('users')
      .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .where('id', '=', input.userId)
      .execute();
  };

  adminResetPassword = async (input: { userId: string; newPassword: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .select('id')
      .where('id', '=', input.userId)
      .executeTakeFirst();

    if (!user) {
      throw new UserNotFoundError();
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db
      .updateTable('users')
      .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .where('id', '=', input.userId)
      .execute();
  };

  #createToken = async (payload: AuthTokenPayload): Promise<string> => {
    return new SignJWT({ email: payload.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.#services.config.jwt.expiresIn)
      .sign(this.#secret);
  };
}

export type { AuthTokenPayload, AuthUser, AuthResponse };
export { AuthService };
