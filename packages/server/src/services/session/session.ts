import { randomUUID } from 'node:crypto';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { SessionNotFoundError } from './session.errors.js';

type Session = {
  id: string;
  userId: string;
  identityId: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  status: string;
  error: string | null;
  repoId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateSessionInput = {
  userId: string;
  identityId: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  repoId?: string;
};

type UpdateSessionStatusInput = {
  sessionId: string;
  status: string;
  error?: string;
};

const mapRow = (row: {
  id: string;
  user_id: string;
  identity_id: string;
  repo_url: string;
  branch: string;
  prompt: string;
  status: string;
  error: string | null;
  repo_id: string | null;
  created_at: string;
  updated_at: string;
}): Session => ({
  id: row.id,
  userId: row.user_id,
  identityId: row.identity_id,
  repoUrl: row.repo_url,
  branch: row.branch,
  prompt: row.prompt,
  status: row.status,
  error: row.error,
  repoId: row.repo_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class SessionService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  create = async (input: CreateSessionInput): Promise<Session> => {
    const db = await this.#database.getInstance();
    const id = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto('sessions')
      .values({
        id,
        user_id: input.userId,
        identity_id: input.identityId,
        repo_url: input.repoUrl,
        branch: input.branch,
        prompt: input.prompt,
        status: 'pending',
        error: null,
        repo_id: input.repoId ?? null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    return {
      id,
      userId: input.userId,
      identityId: input.identityId,
      repoUrl: input.repoUrl,
      branch: input.branch,
      prompt: input.prompt,
      status: 'pending',
      error: null,
      repoId: input.repoId ?? null,
      createdAt: now,
      updatedAt: now,
    };
  };

  list = async (userId: string): Promise<Session[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('sessions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(mapRow);
  };

  get = async (input: { userId: string; sessionId: string }): Promise<Session> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', input.sessionId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new SessionNotFoundError();
    }

    return mapRow(row);
  };

  getById = async (sessionId: string): Promise<Session> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!row) {
      throw new SessionNotFoundError();
    }

    return mapRow(row);
  };

  updateStatus = async (input: UpdateSessionStatusInput): Promise<void> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    await db
      .updateTable('sessions')
      .set({
        status: input.status,
        error: input.error ?? null,
        updated_at: now,
      })
      .where('id', '=', input.sessionId)
      .execute();
  };

  listAll = async (userId?: string): Promise<Session[]> => {
    const db = await this.#database.getInstance();

    let query = db
      .selectFrom('sessions')
      .selectAll()
      .orderBy('created_at', 'desc');

    if (userId) {
      query = query.where('user_id', '=', userId);
    }

    const rows = await query.execute();
    return rows.map(mapRow);
  };

  listByRepo = async (input: { userId: string; repoId: string }): Promise<Session[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('sessions')
      .selectAll()
      .where('user_id', '=', input.userId)
      .where('repo_id', '=', input.repoId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(mapRow);
  };

  delete = async (input: { userId: string; sessionId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const result = await db
      .deleteFrom('sessions')
      .where('id', '=', input.sessionId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new SessionNotFoundError();
    }
  };
}

export type { Session, CreateSessionInput, UpdateSessionStatusInput };
export { SessionService };
