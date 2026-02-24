import { randomUUID } from 'node:crypto';

import type { Services } from '../../container/container.js';
import type { SessionEvent } from '../../sse/event-bus.js';
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

  #ensureSeeded = async (sessionId: string): Promise<void> => {
    if (this.#counters.has(sessionId)) return;
    if (!this.#seedPromises.has(sessionId)) {
      const promise = (async (): Promise<void> => {
        const db = await this.#database.getInstance();
        const row = await db
          .selectFrom('session_events')
          .select(db.fn.max('sequence').as('max_seq'))
          .where('session_id', '=', sessionId)
          .executeTakeFirst();
        this.#counters.set(sessionId, (row?.max_seq as number | null) ?? 0);
      })();
      this.#seedPromises.set(sessionId, promise);
    }
    await this.#seedPromises.get(sessionId);
  };

  nextSequence = async (sessionId: string): Promise<number> => {
    await this.#ensureSeeded(sessionId);
    const current = this.#counters.get(sessionId) ?? 0;
    const next = current + 1;
    this.#counters.set(sessionId, next);
    return next;
  };

  persist = async (sessionId: string, sequence: number, event: SessionEvent): Promise<void> => {
    const db = await this.#database.getInstance();
    await db
      .insertInto('session_events')
      .values({
        id: randomUUID(),
        session_id: sessionId,
        sequence,
        type: event.type,
        data: JSON.stringify(event.data),
        created_at: new Date().toISOString(),
      })
      .execute();
  };

  listBySession = async (input: {
    sessionId: string;
    afterSequence?: number;
  }): Promise<PersistedSessionEvent[]> => {
    const db = await this.#database.getInstance();
    let query = db
      .selectFrom('session_events')
      .selectAll()
      .where('session_id', '=', input.sessionId)
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
    sessionId: string;
    afterSequence: number;
  }): Promise<void> => {
    const db = await this.#database.getInstance();
    await db
      .deleteFrom('session_events')
      .where('session_id', '=', input.sessionId)
      .where('sequence', '>', input.afterSequence)
      .execute();

    this.#counters.set(input.sessionId, input.afterSequence);
  };

  remove = (sessionId: string): void => {
    this.#counters.delete(sessionId);
    this.#seedPromises.delete(sessionId);
  };
}

export type { PersistedSessionEvent };
export { SessionEventService };
