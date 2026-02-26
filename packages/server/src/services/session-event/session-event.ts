import { randomUUID } from 'node:crypto';

import type { Services } from '../../container/container.js';
import type { SessionEvent } from '../../sse/event-bus.js';
import type { SessionRef } from '../session/session.js';
import { sessionKey } from '../session/session.js';
import { DatabaseService } from '../database/database.js';

type PersistedSessionEvent = {
  id: string;
  sessionId: string;
  sequence: number;
  type: string;
  data: unknown;
  createdAt: string;
};

class SessionEventService {
  #services: Services;
  #counters = new Map<string, number>();
  #seedPromises = new Map<string, Promise<void>>();

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  #ensureSeeded = async (key: string, ref: SessionRef): Promise<void> => {
    if (this.#counters.has(key)) return;
    if (!this.#seedPromises.has(key)) {
      const promise = (async (): Promise<void> => {
        const db = await this.#database.getInstance();
        const row = await db
          .selectFrom('session_events')
          .select(db.fn.max('sequence').as('max_seq'))
          .where('session_id', '=', ref.sessionId)
          .where('repo_id', '=', ref.repoId)
          .where('user_id', '=', ref.userId)
          .executeTakeFirst();
        this.#counters.set(key, (row?.max_seq as number | null) ?? 0);
      })();
      this.#seedPromises.set(key, promise);
    }
    await this.#seedPromises.get(key);
  };

  nextSequence = async (ref: SessionRef): Promise<number> => {
    const key = sessionKey(ref);
    await this.#ensureSeeded(key, ref);
    const current = this.#counters.get(key) ?? 0;
    const next = current + 1;
    this.#counters.set(key, next);
    return next;
  };

  persist = async (ref: SessionRef, sequence: number, event: SessionEvent): Promise<void> => {
    const db = await this.#database.getInstance();
    await db
      .insertInto('session_events')
      .values({
        id: randomUUID(),
        session_id: ref.sessionId,
        repo_id: ref.repoId,
        user_id: ref.userId,
        sequence,
        type: event.type,
        data: JSON.stringify(event.data),
        created_at: new Date().toISOString(),
      })
      .execute();
  };

  listBySession = async (input: {
    ref: SessionRef;
    afterSequence?: number;
  }): Promise<PersistedSessionEvent[]> => {
    const db = await this.#database.getInstance();
    let query = db
      .selectFrom('session_events')
      .selectAll()
      .where('session_id', '=', input.ref.sessionId)
      .where('repo_id', '=', input.ref.repoId)
      .where('user_id', '=', input.ref.userId)
      .orderBy('sequence', 'asc');

    if (input.afterSequence !== undefined) {
      query = query.where('sequence', '>', input.afterSequence);
    }

    const rows = await query.execute();

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      sequence: row.sequence,
      type: row.type,
      data: JSON.parse(row.data) as unknown,
      createdAt: row.created_at,
    }));
  };

  deleteAfterSequence = async (input: {
    ref: SessionRef;
    afterSequence: number;
  }): Promise<void> => {
    const db = await this.#database.getInstance();
    await db
      .deleteFrom('session_events')
      .where('session_id', '=', input.ref.sessionId)
      .where('repo_id', '=', input.ref.repoId)
      .where('user_id', '=', input.ref.userId)
      .where('sequence', '>', input.afterSequence)
      .execute();

    const key = sessionKey(input.ref);
    this.#counters.set(key, input.afterSequence);
  };

  remove = (ref: SessionRef): void => {
    const key = sessionKey(ref);
    this.#counters.delete(key);
    this.#seedPromises.delete(key);
  };
}

export type { PersistedSessionEvent };
export { SessionEventService };
