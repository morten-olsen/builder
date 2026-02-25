import type { WebSocket, RawData } from 'ws';
import { z } from 'zod';

import type { Services } from '../container/container.js';
import { AuthService } from '../services/auth/auth.js';
import { EventBusService } from '../sse/event-bus.js';
import type { SessionEvent, UserEvent } from '../sse/event-bus.js';
import { SessionEventService } from '../services/session-event/session-event.js';
import { SessionService } from '../services/session/session.js';

const authMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string(),
});

const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  sessionId: z.string(),
  afterSequence: z.number().int().optional(),
});

const unsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  sessionId: z.string(),
});

const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  unsubscribeMessageSchema,
]);

type WsSessionEvent = {
  kind: 'session:event';
  sessionId: string;
  event: SessionEvent;
  sequence: number;
};

type WsUserEvent = {
  kind: 'user:event';
  event: UserEvent;
};

type WsSyncEvent = {
  kind: 'sync';
  sessionId: string;
  lastSequence: number;
};

type WsAuthOk = {
  kind: 'auth:ok';
};

type WsServerMessage = WsSessionEvent | WsUserEvent | WsSyncEvent | WsAuthOk;

type HandleWebSocketInput = {
  socket: WebSocket;
  services: Services;
};

const AUTH_TIMEOUT_MS = 10_000;

const setupAuthenticatedSocket = (socket: WebSocket, userId: string, services: Services): void => {
  const eventBus = services.get(EventBusService);
  const sessionEventService = services.get(SessionEventService);
  const sessionService = services.get(SessionService);

  const subscriptions = new Map<string, () => void>();

  const send = (message: WsServerMessage): void => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const unsubscribeUser = eventBus.subscribeUser(userId, (event) => {
    send({ kind: 'user:event', event });
  });

  const handleSubscribe = async (sessionId: string, afterSequence?: number): Promise<void> => {
    try {
      await sessionService.get({ userId, sessionId });
    } catch {
      return;
    }

    subscriptions.get(sessionId)?.();

    const buffer: { event: SessionEvent; sequence: number }[] = [];
    let replayed = false;

    const unsubscribe = eventBus.subscribe(sessionId, (event, sequence) => {
      if (replayed) {
        send({ kind: 'session:event', sessionId, event, sequence });
      } else {
        buffer.push({ event, sequence });
      }
    });

    subscriptions.set(sessionId, unsubscribe);

    const historical = await sessionEventService.listBySession({
      sessionId,
      afterSequence,
    });

    let lastSequence = afterSequence ?? 0;

    for (const row of historical) {
      const event = { type: row.type, data: row.data } as SessionEvent;
      send({ kind: 'session:event', sessionId, event, sequence: row.sequence });
      lastSequence = row.sequence;
    }

    send({ kind: 'sync', sessionId, lastSequence });

    replayed = true;
    for (const item of buffer) {
      if (item.sequence > lastSequence) {
        send({ kind: 'session:event', sessionId, event: item.event, sequence: item.sequence });
        lastSequence = item.sequence;
      }
    }
    buffer.length = 0;
  };

  const handleUnsubscribe = (sessionId: string): void => {
    subscriptions.get(sessionId)?.();
    subscriptions.delete(sessionId);
  };

  socket.on('message', (data: RawData) => {
    try {
      const parsed: unknown = JSON.parse(String(data));
      const message = clientMessageSchema.parse(parsed);

      switch (message.type) {
        case 'subscribe':
          handleSubscribe(message.sessionId, message.afterSequence).catch(() => undefined);
          break;
        case 'unsubscribe':
          handleUnsubscribe(message.sessionId);
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  socket.on('close', () => {
    unsubscribeUser();
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe();
    }
    subscriptions.clear();
  });
};

const handleWebSocket = (input: HandleWebSocketInput): void => {
  const { socket, services } = input;
  const authService = services.get(AuthService);

  const authTimeout = setTimeout(() => {
    socket.close(4001, 'Auth timeout');
  }, AUTH_TIMEOUT_MS);

  const onAuthMessage = (data: RawData): void => {
    try {
      const parsed: unknown = JSON.parse(String(data));
      const message = authMessageSchema.parse(parsed);

      authService
        .verifyToken(message.token)
        .then((payload) => {
          clearTimeout(authTimeout);
          socket.removeListener('message', onAuthMessage);
          socket.send(JSON.stringify({ kind: 'auth:ok' } satisfies WsServerMessage));
          setupAuthenticatedSocket(socket, payload.sub, services);
        })
        .catch(() => {
          socket.close(4001, 'Unauthorized');
        });
    } catch {
      socket.close(4001, 'Invalid auth message');
    }
  };

  socket.on('message', onAuthMessage);

  socket.on('close', () => {
    clearTimeout(authTimeout);
  });
};

export type { WsServerMessage, WsSessionEvent, WsUserEvent, WsSyncEvent, WsAuthOk, HandleWebSocketInput };
export { handleWebSocket };
