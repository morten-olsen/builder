import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { IdentityNotFoundError } from './identity.errors.js';
import { decryptPrivateKey, derivePublicKeyFromPrivate, encryptPrivateKey, generateSshKeyPair } from './identity.utils.js';

type Identity = {
  id: string;
  userId: string;
  name: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
};

type CreateIdentityInput = {
  id: string;
  userId: string;
  name: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  publicKey?: string;
  privateKey?: string;
};

type UpdateIdentityInput = {
  userId: string;
  identityId: string;
  name?: string;
  gitAuthorName?: string;
  gitAuthorEmail?: string;
};

class IdentityService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  get #encryptionKey(): string {
    return this.#services.config.encryption.key;
  }

  create = async (input: CreateIdentityInput): Promise<Identity> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    let publicKey: string;
    let encryptedPrivateKey: string;

    if (input.privateKey) {
      publicKey = input.publicKey ?? derivePublicKeyFromPrivate(input.privateKey);
      encryptedPrivateKey = encryptPrivateKey(input.privateKey, this.#encryptionKey);
    } else {
      const keyPair = generateSshKeyPair();
      publicKey = keyPair.publicKey;
      encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, this.#encryptionKey);
    }

    await db
      .insertInto('identities')
      .values({
        id: input.id,
        user_id: input.userId,
        name: input.name,
        git_author_name: input.gitAuthorName,
        git_author_email: input.gitAuthorEmail,
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey,
        created_at: now,
        updated_at: now,
      })
      .execute();

    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      gitAuthorName: input.gitAuthorName,
      gitAuthorEmail: input.gitAuthorEmail,
      publicKey,
      createdAt: now,
      updatedAt: now,
    };
  };

  list = async (userId: string): Promise<Identity[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('identities')
      .select([
        'id',
        'user_id',
        'name',
        'git_author_name',
        'git_author_email',
        'public_key',
        'created_at',
        'updated_at',
      ])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      gitAuthorName: row.git_author_name,
      gitAuthorEmail: row.git_author_email,
      publicKey: row.public_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  };

  get = async (input: { userId: string; identityId: string }): Promise<Identity> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('identities')
      .select([
        'id',
        'user_id',
        'name',
        'git_author_name',
        'git_author_email',
        'public_key',
        'created_at',
        'updated_at',
      ])
      .where('id', '=', input.identityId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new IdentityNotFoundError();
    }

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      gitAuthorName: row.git_author_name,
      gitAuthorEmail: row.git_author_email,
      publicKey: row.public_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  update = async (input: UpdateIdentityInput): Promise<Identity> => {
    const db = await this.#database.getInstance();
    const existing = await this.get({ userId: input.userId, identityId: input.identityId });

    const now = new Date().toISOString();
    const updates: Record<string, string> = { updated_at: now };

    if (input.name !== undefined) updates.name = input.name;
    if (input.gitAuthorName !== undefined) updates.git_author_name = input.gitAuthorName;
    if (input.gitAuthorEmail !== undefined) updates.git_author_email = input.gitAuthorEmail;

    await db
      .updateTable('identities')
      .set(updates)
      .where('id', '=', input.identityId)
      .where('user_id', '=', input.userId)
      .execute();

    return {
      ...existing,
      name: input.name ?? existing.name,
      gitAuthorName: input.gitAuthorName ?? existing.gitAuthorName,
      gitAuthorEmail: input.gitAuthorEmail ?? existing.gitAuthorEmail,
      updatedAt: now,
    };
  };

  delete = async (input: { userId: string; identityId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const result = await db
      .deleteFrom('identities')
      .where('id', '=', input.identityId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new IdentityNotFoundError();
    }
  };

  listAll = async (userId?: string): Promise<Identity[]> => {
    const db = await this.#database.getInstance();

    let query = db
      .selectFrom('identities')
      .select([
        'id',
        'user_id',
        'name',
        'git_author_name',
        'git_author_email',
        'public_key',
        'created_at',
        'updated_at',
      ])
      .orderBy('created_at', 'desc');

    if (userId) {
      query = query.where('user_id', '=', userId);
    }

    const rows = await query.execute();

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      gitAuthorName: row.git_author_name,
      gitAuthorEmail: row.git_author_email,
      publicKey: row.public_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  };

  getPrivateKey = async (input: { userId: string; identityId: string }): Promise<string> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('identities')
      .select('encrypted_private_key')
      .where('id', '=', input.identityId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new IdentityNotFoundError();
    }

    return decryptPrivateKey(row.encrypted_private_key, this.#encryptionKey);
  };
}

export type { Identity, CreateIdentityInput, UpdateIdentityInput };
export { IdentityService };
