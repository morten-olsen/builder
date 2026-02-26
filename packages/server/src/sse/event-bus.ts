import { EventEmitter } from 'node:events';

import { destroy } from '../container/container.js';
import type { Services } from '../container/container.js';
import { DatabaseService } from '../services/database/database.js';
import { NotificationService } from '../services/notification/notification.js';
import type { SessionRef } from '../services/session/session.js';
import { sessionKey } from '../services/session/session.js';
import { SessionEventService } from '../services/session-event/session-event.js';

type SessionEvent =
  | { type: 'agent:output'; data: { text: string; messageType: string } }
  | { type: 'agent:tool_use'; data: { tool: string; input: unknown } }
  | { type: 'agent:tool_result'; data: { tool: string; output: unknown } }
  | { type: 'user:message'; data: { message: string } }
  | { type: 'session:status'; data: { status: string } }
  | { type: 'session:waiting_for_input'; data: { prompt: string } }
  | { type: 'session:completed'; data: { summary: string } }
  | { type: 'session:error'; data: { error: string } }
  | { type: 'session:snapshot'; data: { messageId: string; commitSha: string } };

type UserEvent = { type: 'session:updated'; data: { sessionId: string; status: string } };

type SessionEventListener = (event: SessionEvent, sequence: number) => void;
type UserEventListener = (event: UserEvent) => void;

class EventBusService {
  #services: Services;
  #emitters = new Map<string, EventEmitter>();
  #userEmitters = new Map<string, EventEmitter>();
  #sessionRefs = new Map<string, SessionRef>();

  constructor(services: Services) {
    this.#services = services;
  }

  get #sessionEventService(): SessionEventService {
    return this.#services.get(SessionEventService);
  }

  #getOrCreate = (key: string): EventEmitter => {
    let emitter = this.#emitters.get(key);
    if (!emitter) {
      emitter = new EventEmitter();
      this.#emitters.set(key, emitter);
    }
    return emitter;
  };

  #getUserEmitter = (userId: string): EventEmitter => {
    let emitter = this.#userEmitters.get(userId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.#userEmitters.set(userId, emitter);
    }
    return emitter;
  };

  registerSession = (ref: SessionRef): void => {
    const key = sessionKey(ref);
    this.#sessionRefs.set(key, ref);
  };

  emit = (ref: SessionRef, event: SessionEvent): void => {
    const key = sessionKey(ref);
    const doEmit = async (): Promise<void> => {
      const sequence = await this.#sessionEventService.nextSequence(ref);
      const emitter = this.#getOrCreate(key);
      emitter.emit('event', event, sequence);
      this.#sessionEventService.persist(ref, sequence, event).catch(() => undefined);

      if (event.type === 'session:status') {
        const userEmitter = this.#getUserEmitter(ref.userId);
        userEmitter.emit('event', {
          type: 'session:updated',
          data: { sessionId: ref.sessionId, status: event.data.status },
        } satisfies UserEvent);
      }

      // Dispatch push notifications for significant events
      const notificationEvent = this.#mapToNotification(event);
      if (notificationEvent) {
        this.#dispatchNotification(ref, notificationEvent).catch(() => undefined);
      }
    };
    doEmit().catch(() => undefined);
  };

  subscribe = (ref: SessionRef, listener: SessionEventListener): (() => void) => {
    const key = sessionKey(ref);
    const emitter = this.#getOrCreate(key);
    emitter.on('event', listener);
    return () => {
      emitter.off('event', listener);
    };
  };

  subscribeUser = (userId: string, listener: UserEventListener): (() => void) => {
    const emitter = this.#getUserEmitter(userId);
    emitter.on('event', listener);
    return () => {
      emitter.off('event', listener);
    };
  };

  #mapToNotification = (event: SessionEvent): { type: string; title: string; body: string; level: 'info' | 'warning' | 'error' } | null => {
    switch (event.type) {
      case 'session:completed':
        return { type: 'session:completed', title: 'Session completed', body: event.data.summary, level: 'info' };
      case 'session:error':
        return { type: 'session:error', title: 'Session failed', body: event.data.error, level: 'error' };
      case 'session:waiting_for_input':
        return { type: 'session:waiting_for_input', title: 'Input needed', body: event.data.prompt, level: 'warning' };
      default:
        return null;
    }
  };

  #dispatchNotification = async (ref: SessionRef, event: { type: string; title: string; body: string; level: 'info' | 'warning' | 'error' }): Promise<void> => {
    const notificationService = this.#services.get(NotificationService);
    const prefs = await notificationService.getPreferences(ref.userId);

    // Check global event-type filter
    if (!prefs.notificationEvents.includes(event.type)) return;

    // Check session-level override, then global toggle
    const db = await this.#services.get(DatabaseService).getInstance();
    const session = await db
      .selectFrom('sessions')
      .select('notifications_enabled')
      .where('id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
      .executeTakeFirst();

    const sessionOverride = session?.notifications_enabled;
    const enabled = sessionOverride !== null && sessionOverride !== undefined
      ? sessionOverride === 1
      : prefs.notificationsEnabled;

    if (!enabled) return;

    await notificationService.dispatch(ref.userId, {
      title: event.title,
      body: event.body,
      level: event.level,
      sessionId: ref.sessionId,
    });
  };

  remove = (ref: SessionRef): void => {
    const key = sessionKey(ref);
    const emitter = this.#emitters.get(key);
    if (emitter) {
      emitter.removeAllListeners();
      this.#emitters.delete(key);
    }
    this.#sessionRefs.delete(key);
    this.#sessionEventService.remove(ref);
  };

  [destroy] = async (): Promise<void> => {
    for (const emitter of this.#emitters.values()) {
      emitter.removeAllListeners();
    }
    this.#emitters.clear();
    for (const emitter of this.#userEmitters.values()) {
      emitter.removeAllListeners();
    }
    this.#userEmitters.clear();
    this.#sessionRefs.clear();
  };
}

export type { SessionEvent, UserEvent, SessionEventListener, UserEventListener };
export { EventBusService };
