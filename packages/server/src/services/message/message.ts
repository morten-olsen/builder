import { randomUUID } from 'node:crypto';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';

type Message = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  commitSha: string | null;
  createdAt: string;
};

type CreateMessageInput = {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  commitSha?: string;
};

const mapRow = (row: {
  id: string;
  session_id: string;
  role: string;
  content: string;
  commit_sha: string | null;
  created_at: string;
}): Message => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role as 'user' | 'assistant',
  content: row.content,
  commitSha: row.commit_sha,
  createdAt: row.created_at,
});

class MessageService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  create = async (input: CreateMessageInput): Promise<Message> => {
    const db = await this.#database.getInstance();
    const id = randomUUID();
    const now = new Date().toISOString();
    const commitSha = input.commitSha ?? null;

    await db
      .insertInto('messages')
      .values({
        id,
        session_id: input.sessionId,
        role: input.role,
        content: input.content,
        commit_sha: commitSha,
        created_at: now,
      })
      .execute();

    return {
      id,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      commitSha,
      createdAt: now,
    };
  };

  getById = async (messageId: string): Promise<Message> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('messages')
      .selectAll()
      .where('id', '=', messageId)
      .executeTakeFirst();

    if (!row) {
      throw new Error('Message not found');
    }

    return mapRow(row);
  };

  deleteAfter = async (input: { sessionId: string; messageId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const target = await db
      .selectFrom('messages')
      .select('created_at')
      .where('id', '=', input.messageId)
      .where('session_id', '=', input.sessionId)
      .executeTakeFirst();

    if (!target) {
      throw new Error('Message not found');
    }

    await db
      .deleteFrom('messages')
      .where('session_id', '=', input.sessionId)
      .where('created_at', '>', target.created_at)
      .execute();
  };

  listBySession = async (sessionId: string): Promise<Message[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('messages')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map(mapRow);
  };
}

export type { Message, CreateMessageInput };
export { MessageService };
