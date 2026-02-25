import { EventEmitter } from 'node:events';

import { destroy } from '../container/container.js';
import type { Services } from '../container/container.js';
import { DatabaseService } from '../services/database/database.js';
import { NotificationService } from '../services/notification/notification.js';
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
  #sessionUsers = new Map<string, string>();

  constructor(services: Services) {
    this.#services = services;
  }

  get #sessionEventService(): SessionEventService {
    return this.#services.get(SessionEventService);
  }

  #getOrCreate = (sessionId: string): EventEmitter => {
    let emitter = this.#emitters.get(sessionId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.#emitters.set(sessionId, emitter);
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

  registerSession = (sessionId: string, userId: string): void => {
    this.#sessionUsers.set(sessionId, userId);
  };

  emit = (sessionId: string, event: SessionEvent): void => {
    const doEmit = async (): Promise<void> => {
      const sequence = await this.#sessionEventService.nextSequence(sessionId);
      const emitter = this.#getOrCreate(sessionId);
      emitter.emit('event', event, sequence);
      this.#sessionEventService.persist(sessionId, sequence, event).catch(() => undefined);

      if (event.type === 'session:status') {
        const userId = this.#sessionUsers.get(sessionId);
        if (userId) {
          const userEmitter = this.#getUserEmitter(userId);
          userEmitter.emit('event', {
            type: 'session:updated',
            data: { sessionId, status: event.data.status },
          } satisfies UserEvent);
        }
      }

      // Dispatch push notifications for significant events
      const notificationEvent = this.#mapToNotification(event, sessionId);
      if (notificationEvent) {
        const userId = this.#sessionUsers.get(sessionId);
        if (userId) {
          this.#dispatchNotification(userId, sessionId, notificationEvent).catch(() => undefined);
        }
      }
    };
    doEmit().catch(() => undefined);
  };

  subscribe = (sessionId: string, listener: SessionEventListener): (() => void) => {
    const emitter = this.#getOrCreate(sessionId);
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

  #mapToNotification = (event: SessionEvent, sessionId: string): { type: string; title: string; body: string; level: 'info' | 'warning' | 'error' } | null => {
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

  #dispatchNotification = async (userId: string, sessionId: string, event: { type: string; title: string; body: string; level: 'info' | 'warning' | 'error' }): Promise<void> => {
    const notificationService = this.#services.get(NotificationService);
    const prefs = await notificationService.getPreferences(userId);

    // Check global event-type filter
    if (!prefs.notificationEvents.includes(event.type)) return;

    // Check session-level override, then global toggle
    const db = await this.#services.get(DatabaseService).getInstance();
    const session = await db
      .selectFrom('sessions')
      .select('notifications_enabled')
      .where('id', '=', sessionId)
      .executeTakeFirst();

    const sessionOverride = session?.notifications_enabled;
    const enabled = sessionOverride !== null && sessionOverride !== undefined
      ? sessionOverride === 1
      : prefs.notificationsEnabled;

    if (!enabled) return;

    await notificationService.dispatch(userId, {
      title: event.title,
      body: event.body,
      level: event.level,
      sessionId,
    });
  };

  remove = (sessionId: string): void => {
    const emitter = this.#emitters.get(sessionId);
    if (emitter) {
      emitter.removeAllListeners();
      this.#emitters.delete(sessionId);
    }
    this.#sessionUsers.delete(sessionId);
    this.#sessionEventService.remove(sessionId);
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
    this.#sessionUsers.clear();
  };
}

export type { SessionEvent, UserEvent, SessionEventListener, UserEventListener };
export { EventBusService };
