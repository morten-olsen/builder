import type { Migration, MigrationProvider } from 'kysely';
import { sql } from 'kysely';

const migrations: Record<string, Migration> = {
  '001_create_users': {
    up: async (db) => {
      await db.schema
        .createTable('users')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('email', 'text', (col) => col.notNull().unique())
        .addColumn('password_hash', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();
    },
    down: async (db) => {
      await db.schema.dropTable('users').execute();
    },
  },
  '002_create_identities': {
    up: async (db) => {
      await db.schema
        .createTable('identities')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) =>
          col.notNull().references('users.id').onDelete('cascade'),
        )
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('git_author_name', 'text', (col) => col.notNull())
        .addColumn('git_author_email', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('encrypted_private_key', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_identities_user_id')
        .on('identities')
        .column('user_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_identities_user_id').execute();
      await db.schema.dropTable('identities').execute();
    },
  },
  '003_create_sessions': {
    up: async (db) => {
      await db.schema
        .createTable('sessions')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) =>
          col.notNull().references('users.id').onDelete('cascade'),
        )
        .addColumn('identity_id', 'text', (col) =>
          col.notNull().references('identities.id'),
        )
        .addColumn('repo_url', 'text', (col) => col.notNull())
        .addColumn('branch', 'text', (col) => col.notNull())
        .addColumn('prompt', 'text', (col) => col.notNull())
        .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
        .addColumn('error', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_sessions_user_id')
        .on('sessions')
        .column('user_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_sessions_user_id').execute();
      await db.schema.dropTable('sessions').execute();
    },
  },
  '004_create_repos': {
    up: async (db) => {
      await db.schema
        .createTable('repos')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) =>
          col.notNull().references('users.id').onDelete('cascade'),
        )
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('repo_url', 'text', (col) => col.notNull())
        .addColumn('default_branch', 'text')
        .addColumn('default_identity_id', 'text', (col) =>
          col.references('identities.id').onDelete('set null'),
        )
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_repos_user_id')
        .on('repos')
        .column('user_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_repos_user_id').execute();
      await db.schema.dropTable('repos').execute();
    },
  },
  '005_add_repo_id_to_sessions': {
    up: async (db) => {
      await db.schema
        .alterTable('sessions')
        .addColumn('repo_id', 'text', (col) =>
          col.references('repos.id').onDelete('set null'),
        )
        .execute();

      await db.schema
        .createIndex('idx_sessions_repo_id')
        .on('sessions')
        .column('repo_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_sessions_repo_id').execute();
      await db.schema
        .alterTable('sessions')
        .dropColumn('repo_id')
        .execute();
    },
  },
  '006_create_messages': {
    up: async (db) => {
      await db.schema
        .createTable('messages')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('session_id', 'text', (col) =>
          col.notNull().references('sessions.id').onDelete('cascade'),
        )
        .addColumn('role', 'text', (col) => col.notNull())
        .addColumn('content', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_messages_session_id')
        .on('messages')
        .column('session_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_messages_session_id').execute();
      await db.schema.dropTable('messages').execute();
    },
  },
  '007_fix_sessions_identity_fk': {
    up: async (db) => {
      await sql`
        CREATE TABLE sessions_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
          repo_url TEXT NOT NULL,
          branch TEXT NOT NULL,
          prompt TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          error TEXT,
          repo_id TEXT REFERENCES repos(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `.execute(db);
      await sql`
        INSERT INTO sessions_new (id, user_id, identity_id, repo_url, branch, prompt, status, error, repo_id, created_at, updated_at)
        SELECT id, user_id, identity_id, repo_url, branch, prompt, status, error, repo_id, created_at, updated_at FROM sessions
      `.execute(db);
      await sql`DROP TABLE sessions`.execute(db);
      await sql`ALTER TABLE sessions_new RENAME TO sessions`.execute(db);
      await db.schema
        .createIndex('idx_sessions_user_id')
        .on('sessions')
        .column('user_id')
        .execute();
      await db.schema
        .createIndex('idx_sessions_repo_id')
        .on('sessions')
        .column('repo_id')
        .execute();
    },
    down: async () => {
      // Not reversible without losing the fix
    },
  },
  '008_create_session_events': {
    up: async (db) => {
      await db.schema
        .createTable('session_events')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('session_id', 'text', (col) =>
          col.notNull().references('sessions.id').onDelete('cascade'),
        )
        .addColumn('sequence', 'integer', (col) => col.notNull())
        .addColumn('type', 'text', (col) => col.notNull())
        .addColumn('data', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_session_events_session_sequence')
        .on('session_events')
        .columns(['session_id', 'sequence'])
        .unique()
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_session_events_session_sequence').execute();
      await db.schema.dropTable('session_events').execute();
    },
  },
  '009_create_file_reviews': {
    up: async (db) => {
      await db.schema
        .createTable('file_reviews')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('session_id', 'text', (col) =>
          col.notNull().references('sessions.id').onDelete('cascade'),
        )
        .addColumn('user_id', 'text', (col) =>
          col.notNull().references('users.id').onDelete('cascade'),
        )
        .addColumn('file_path', 'text', (col) => col.notNull())
        .addColumn('file_hash', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_file_reviews_session_user_path')
        .on('file_reviews')
        .columns(['session_id', 'user_id', 'file_path'])
        .unique()
        .execute();

      await db.schema
        .createIndex('idx_file_reviews_session_id')
        .on('file_reviews')
        .column('session_id')
        .execute();
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_file_reviews_session_user_path').execute();
      await db.schema.dropIndex('idx_file_reviews_session_id').execute();
      await db.schema.dropTable('file_reviews').execute();
    },
  },
  '010_add_commit_sha_to_messages': {
    up: async (db) => {
      await sql`ALTER TABLE messages ADD COLUMN commit_sha TEXT`.execute(db);
    },
    down: async (db) => {
      await db.schema
        .alterTable('messages')
        .dropColumn('commit_sha')
        .execute();
    },
  },
  '011_create_notification_channels': {
    up: async (db) => {
      await db.schema
        .createTable('notification_channels')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) =>
          col.notNull().references('users.id').onDelete('cascade'),
        )
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('provider', 'text', (col) => col.notNull())
        .addColumn('encrypted_config', 'text', (col) => col.notNull())
        .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await db.schema
        .createIndex('idx_notification_channels_user_id')
        .on('notification_channels')
        .column('user_id')
        .execute();

      await sql`ALTER TABLE users ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1`.execute(db);
      await sql`ALTER TABLE users ADD COLUMN notification_events TEXT NOT NULL DEFAULT '["session:completed","session:error","session:waiting_for_input"]'`.execute(db);

      await sql`ALTER TABLE sessions ADD COLUMN notifications_enabled INTEGER`.execute(db);
    },
    down: async (db) => {
      await db.schema.dropIndex('idx_notification_channels_user_id').execute();
      await db.schema.dropTable('notification_channels').execute();
      // SQLite doesn't support DROP COLUMN in older versions; omit column removal
    },
  },
  '012_add_pinned_to_sessions': {
    up: async (db) => {
      await sql`ALTER TABLE sessions ADD COLUMN pinned_at TEXT`.execute(db);
    },
    down: async (db) => {
      await db.schema
        .alterTable('sessions')
        .dropColumn('pinned_at')
        .execute();
    },
  },
  '013_add_session_branch_to_sessions': {
    up: async (db) => {
      await sql`ALTER TABLE sessions ADD COLUMN session_branch TEXT`.execute(db);
    },
    down: async (db) => {
      await db.schema
        .alterTable('sessions')
        .dropColumn('session_branch')
        .execute();
    },
  },
};

const migrationProvider: MigrationProvider = {
  getMigrations: async () => migrations,
};

export { migrationProvider };
