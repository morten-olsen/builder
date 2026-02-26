import { SignJWT, jwtVerify } from 'jose';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { InvalidCredentialsError, InvalidTokenError, UserAlreadyExistsError, UserNotFoundError } from './auth.errors.js';
import { hashPassword, verifyPassword } from './auth.utils.js';

type AuthTokenPayload = {
  sub: string;
};

type AuthUser = {
  id: string;
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

  register = async (input: { id: string; password: string }): Promise<AuthResponse> => {
    const db = await this.#database.getInstance();

    const existing = await db
      .selectFrom('users')
      .select('id')
      .where('id', '=', input.id)
      .executeTakeFirst();

    if (existing) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();

    await db
      .insertInto('users')
      .values({
        id: input.id,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const token = await this.#createToken({ sub: input.id });

    return {
      token,
      user: { id: input.id, createdAt: now },
    };
  };

  login = async (input: { id: string; password: string }): Promise<AuthResponse> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', input.id)
      .executeTakeFirst();

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const token = await this.#createToken({ sub: user.id });

    return {
      token,
      user: { id: user.id, createdAt: user.created_at },
    };
  };

  verifyToken = async (token: string): Promise<AuthTokenPayload> => {
    try {
      const { payload } = await jwtVerify(token, this.#secret);
      return {
        sub: payload.sub as string,
      };
    } catch {
      throw new InvalidTokenError();
    }
  };

  getMe = async (userId: string): Promise<AuthUser> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .select(['id', 'created_at'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new InvalidCredentialsError();
    }

    return { id: user.id, createdAt: user.created_at };
  };

  listUsers = async (): Promise<AuthUser[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('users')
      .select(['id', 'created_at'])
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({ id: row.id, createdAt: row.created_at }));
  };

  getWorktreeBase = async (userId: string): Promise<string | null> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('users')
      .select('worktree_base')
      .where('id', '=', userId)
      .executeTakeFirst();

    return row?.worktree_base ?? null;
  };

  setWorktreeBase = async (input: { userId: string; worktreeBase: string | null }): Promise<void> => {
    const db = await this.#database.getInstance();

    const user = await db
      .selectFrom('users')
      .select('id')
      .where('id', '=', input.userId)
      .executeTakeFirst();

    if (!user) {
      throw new UserNotFoundError();
    }

    await db
      .updateTable('users')
      .set({ worktree_base: input.worktreeBase, updated_at: new Date().toISOString() })
      .where('id', '=', input.userId)
      .execute();
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
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.#services.config.jwt.expiresIn)
      .sign(this.#secret);
  };
}

export type { AuthTokenPayload, AuthUser, AuthResponse };
export { AuthService };
