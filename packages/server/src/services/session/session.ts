import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { SessionAlreadyExistsError, SessionNotFoundError } from './session.errors.js';

type SessionRef = {
  userId: string;
  repoId: string;
  sessionId: string;
};

type Session = {
  id: string;
  userId: string;
  repoId: string;
  identityId: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  status: string;
  error: string | null;
  model: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateSessionInput = {
  id: string;
  userId: string;
  repoId: string;
  identityId: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  model?: string;
};

type UpdateSessionStatusInput = {
  ref: SessionRef;
  status: string;
  error?: string;
};

const sessionKey = (ref: SessionRef): string =>
  `${ref.userId}/${ref.repoId}/${ref.sessionId}`;

const sessionRef = (session: Session): SessionRef => ({
  userId: session.userId,
  repoId: session.repoId,
  sessionId: session.id,
});

const mapRow = (row: {
  id: string;
  user_id: string;
  repo_id: string;
  identity_id: string;
  repo_url: string;
  branch: string;
  prompt: string;
  status: string;
  error: string | null;
  model: string | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
}): Session => ({
  id: row.id,
  userId: row.user_id,
  repoId: row.repo_id,
  identityId: row.identity_id,
  repoUrl: row.repo_url,
  branch: row.branch,
  prompt: row.prompt,
  status: row.status,
  error: row.error,
  model: row.model,
  pinnedAt: row.pinned_at,
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
    const now = new Date().toISOString();

    try {
      await db
        .insertInto('sessions')
        .values({
          id: input.id,
          user_id: input.userId,
          repo_id: input.repoId,
          identity_id: input.identityId,
          repo_url: input.repoUrl,
          branch: input.branch,
          prompt: input.prompt,
          status: 'pending',
          error: null,
          model: input.model ?? null,
          created_at: now,
          updated_at: now,
        })
        .execute();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new SessionAlreadyExistsError();
      }
      throw error;
    }

    return {
      id: input.id,
      userId: input.userId,
      repoId: input.repoId,
      identityId: input.identityId,
      repoUrl: input.repoUrl,
      branch: input.branch,
      prompt: input.prompt,
      status: 'pending',
      error: null,
      model: input.model ?? null,
      pinnedAt: null,
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

  getByRef = async (ref: SessionRef): Promise<Session> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
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
      .where('id', '=', input.ref.sessionId)
      .where('repo_id', '=', input.ref.repoId)
      .where('user_id', '=', input.ref.userId)
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

  pin = async (ref: SessionRef): Promise<void> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    await db
      .updateTable('sessions')
      .set({ pinned_at: now, updated_at: now })
      .where('id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
      .execute();
  };

  unpin = async (ref: SessionRef): Promise<void> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    await db
      .updateTable('sessions')
      .set({ pinned_at: null, updated_at: now })
      .where('id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
      .execute();
  };

  delete = async (ref: SessionRef): Promise<void> => {
    const db = await this.#database.getInstance();

    const result = await db
      .deleteFrom('sessions')
      .where('id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new SessionNotFoundError();
    }
  };
}

export type { SessionRef, Session, CreateSessionInput, UpdateSessionStatusInput };
export { sessionKey, sessionRef, SessionService };
