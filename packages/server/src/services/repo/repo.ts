import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

import { RepoNotFoundError } from './repo.errors.js';

type Repo = {
  id: string;
  userId: string;
  name: string;
  repoUrl: string;
  defaultBranch: string | null;
  defaultIdentityId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateRepoInput = {
  id: string;
  userId: string;
  name: string;
  repoUrl: string;
  defaultBranch?: string;
  defaultIdentityId?: string;
};

type UpdateRepoInput = {
  userId: string;
  repoId: string;
  name?: string;
  repoUrl?: string;
  defaultBranch?: string | null;
  defaultIdentityId?: string | null;
};

const mapRow = (row: {
  id: string;
  user_id: string;
  name: string;
  repo_url: string;
  default_branch: string | null;
  default_identity_id: string | null;
  created_at: string;
  updated_at: string;
}): Repo => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  repoUrl: row.repo_url,
  defaultBranch: row.default_branch,
  defaultIdentityId: row.default_identity_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class RepoService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  create = async (input: CreateRepoInput): Promise<Repo> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    await db
      .insertInto('repos')
      .values({
        id: input.id,
        user_id: input.userId,
        name: input.name,
        repo_url: input.repoUrl,
        default_branch: input.defaultBranch ?? null,
        default_identity_id: input.defaultIdentityId ?? null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      repoUrl: input.repoUrl,
      defaultBranch: input.defaultBranch ?? null,
      defaultIdentityId: input.defaultIdentityId ?? null,
      createdAt: now,
      updatedAt: now,
    };
  };

  list = async (userId: string): Promise<Repo[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('repos')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map(mapRow);
  };

  get = async (input: { userId: string; repoId: string }): Promise<Repo> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('repos')
      .selectAll()
      .where('id', '=', input.repoId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new RepoNotFoundError();
    }

    return mapRow(row);
  };

  update = async (input: UpdateRepoInput): Promise<Repo> => {
    const db = await this.#database.getInstance();
    const existing = await this.get({ userId: input.userId, repoId: input.repoId });

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { updated_at: now };

    if (input.name !== undefined) updates.name = input.name;
    if (input.repoUrl !== undefined) updates.repo_url = input.repoUrl;
    if (input.defaultBranch !== undefined) updates.default_branch = input.defaultBranch;
    if (input.defaultIdentityId !== undefined) updates.default_identity_id = input.defaultIdentityId;

    await db
      .updateTable('repos')
      .set(updates)
      .where('id', '=', input.repoId)
      .where('user_id', '=', input.userId)
      .execute();

    return {
      ...existing,
      name: input.name ?? existing.name,
      repoUrl: input.repoUrl ?? existing.repoUrl,
      defaultBranch: input.defaultBranch !== undefined ? input.defaultBranch : existing.defaultBranch,
      defaultIdentityId: input.defaultIdentityId !== undefined ? input.defaultIdentityId : existing.defaultIdentityId,
      updatedAt: now,
    };
  };

  delete = async (input: { userId: string; repoId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const result = await db
      .deleteFrom('repos')
      .where('id', '=', input.repoId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new RepoNotFoundError();
    }
  };

  listAll = async (userId?: string): Promise<Repo[]> => {
    const db = await this.#database.getInstance();

    let query = db
      .selectFrom('repos')
      .selectAll()
      .orderBy('created_at', 'desc');

    if (userId) {
      query = query.where('user_id', '=', userId);
    }

    const rows = await query.execute();
    return rows.map(mapRow);
  };
}

export type { Repo, CreateRepoInput, UpdateRepoInput };
export { RepoService };
