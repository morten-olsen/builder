import type { Migration, MigrationProvider } from 'kysely';
import { sql } from 'kysely';

const migrations: Record<string, Migration> = {
  '001_initial_schema': {
    up: async (db) => {
      await db.schema
        .createTable('users')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('password_hash', 'text', (col) => col.notNull())
        .addColumn('worktree_base', 'text')
        .addColumn('notifications_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('notification_events', 'text', (col) =>
          col.notNull().defaultTo('["session:completed","session:error","session:waiting_for_input"]'),
        )
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`(datetime('now'))`))
        .execute();

      await sql`
        CREATE TABLE identities (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          git_author_name TEXT NOT NULL,
          git_author_email TEXT NOT NULL,
          public_key TEXT NOT NULL,
          encrypted_private_key TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, user_id)
        )
      `.execute(db);

      await db.schema
        .createIndex('idx_identities_user_id')
        .on('identities')
        .column('user_id')
        .execute();

      await sql`
        CREATE TABLE repos (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          default_branch TEXT,
          default_identity_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, user_id),
          FOREIGN KEY (default_identity_id, user_id) REFERENCES identities(id, user_id) ON DELETE SET NULL
        )
      `.execute(db);

      await db.schema
        .createIndex('idx_repos_user_id')
        .on('repos')
        .column('user_id')
        .execute();

      await sql`
        CREATE TABLE sessions (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          repo_id TEXT NOT NULL,
          identity_id TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          branch TEXT NOT NULL,
          prompt TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          error TEXT,
          model TEXT,
          notifications_enabled INTEGER,
          pinned_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (id, repo_id, user_id),
          FOREIGN KEY (repo_id, user_id) REFERENCES repos(id, user_id) ON DELETE CASCADE,
          FOREIGN KEY (identity_id, user_id) REFERENCES identities(id, user_id)
        )
      `.execute(db);

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

      await sql`
        CREATE TABLE messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          repo_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          commit_sha TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (session_id, repo_id, user_id) REFERENCES sessions(id, repo_id, user_id) ON DELETE CASCADE
        )
      `.execute(db);

      await db.schema
        .createIndex('idx_messages_session')
        .on('messages')
        .columns(['session_id', 'repo_id', 'user_id'])
        .execute();

      await sql`
        CREATE TABLE session_events (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          repo_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (session_id, repo_id, user_id) REFERENCES sessions(id, repo_id, user_id) ON DELETE CASCADE
        )
      `.execute(db);

      await db.schema
        .createIndex('idx_session_events_session_sequence')
        .on('session_events')
        .columns(['session_id', 'repo_id', 'user_id', 'sequence'])
        .unique()
        .execute();

      await sql`
        CREATE TABLE file_reviews (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          repo_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (session_id, repo_id, user_id) REFERENCES sessions(id, repo_id, user_id) ON DELETE CASCADE
        )
      `.execute(db);

      await db.schema
        .createIndex('idx_file_reviews_session_user_path')
        .on('file_reviews')
        .columns(['session_id', 'repo_id', 'user_id', 'file_path'])
        .unique()
        .execute();

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
    },
    down: async (db) => {
      await db.schema.dropTable('notification_channels').execute();
      await db.schema.dropTable('file_reviews').execute();
      await db.schema.dropTable('session_events').execute();
      await db.schema.dropTable('messages').execute();
      await db.schema.dropTable('sessions').execute();
      await db.schema.dropTable('repos').execute();
      await db.schema.dropTable('identities').execute();
      await db.schema.dropTable('users').execute();
    },
  },
  '002_add_provider_to_sessions': {
    up: async (db) => {
      await sql`ALTER TABLE sessions ADD COLUMN provider TEXT`.execute(db);
    },
    down: async (db) => {
      await sql`ALTER TABLE sessions DROP COLUMN provider`.execute(db);
    },
  },
};

const migrationProvider: MigrationProvider = {
  getMigrations: async () => migrations,
};

export { migrationProvider };
