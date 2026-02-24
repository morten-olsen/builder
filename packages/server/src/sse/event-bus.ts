import { EventEmitter } from 'node:events';

import { destroy } from '../container/container.js';
import type { Services } from '../container/container.js';
import { SessionEventService } from '../services/session-event/session-event.js';

type SessionEvent =
  | { type: 'agent:output'; data: { text: string; messageType: string } }
  | { type: 'agent:tool_use'; data: { tool: string; input: unknown } }
  | { type: 'agent:tool_result'; data: { tool: string; output: unknown } }
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
