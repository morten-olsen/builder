import BetterSqlite3 from 'better-sqlite3';
import type { Generated } from 'kysely';
import { Kysely, Migrator, SqliteDialect } from 'kysely';

import { destroy, Services } from '../../container/container.js';

import { migrationProvider } from './database.migrations.js';

type UsersTable = {
  id: string;
  password_hash: string;
  worktree_base: string | null;
  notifications_enabled: Generated<number>;
  notification_events: Generated<string>;
  created_at: string;
  updated_at: string;
};

type IdentitiesTable = {
  id: string;
  user_id: string;
  name: string;
  git_author_name: string;
  git_author_email: string;
  public_key: string;
  encrypted_private_key: string;
  created_at: string;
  updated_at: string;
};

type SessionsTable = {
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
  provider: string | null;
  notifications_enabled: number | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReposTable = {
  id: string;
  user_id: string;
  name: string;
  repo_url: string | null;
  default_branch: string | null;
  default_identity_id: string | null;
  created_at: string;
  updated_at: string;
};

type MessagesTable = {
  id: string;
  session_id: string;
  repo_id: string;
  user_id: string;
  role: string;
  content: string;
  commit_sha: string | null;
  created_at: string;
};

type SessionEventsTable = {
  id: string;
  session_id: string;
  repo_id: string;
  user_id: string;
  sequence: number;
  type: string;
  data: string;
  created_at: string;
};

type FileReviewsTable = {
  id: string;
  session_id: string;
  repo_id: string;
  user_id: string;
  file_path: string;
  file_hash: string;
  created_at: string;
};

type NotificationChannelsTable = {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  encrypted_config: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

type DatabaseSchema = {
  users: UsersTable;
  identities: IdentitiesTable;
  sessions: SessionsTable;
  repos: ReposTable;
  messages: MessagesTable;
  session_events: SessionEventsTable;
  file_reviews: FileReviewsTable;
  notification_channels: NotificationChannelsTable;
};

class DatabaseService {
  #db?: Promise<Kysely<DatabaseSchema>>;
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  public getInstance = (): Promise<Kysely<DatabaseSchema>> => {
    if (!this.#db) {
      this.#db = this.#initialize();
    }
    return this.#db;
  }

  #initialize = async (): Promise<Kysely<DatabaseSchema>> => {
    const { config } = this.#services;
    const dialect = new SqliteDialect({
      database: new BetterSqlite3(config.db.path),
    });

    const db = new Kysely<DatabaseSchema>({ dialect });

    const migrator = new Migrator({
      db,
      provider: migrationProvider,
    });

    const { error } = await migrator.migrateToLatest();
    if (error) {
      throw error;
    }
    return db;
  };

  [destroy] = async (): Promise<void> => {
    if (this.#db) {
      (await this.#db).destroy();
      this.#db = undefined;
    }
  };
}

export type { DatabaseSchema, UsersTable, IdentitiesTable, SessionsTable, ReposTable, MessagesTable, SessionEventsTable, FileReviewsTable, NotificationChannelsTable };
export { DatabaseService };
