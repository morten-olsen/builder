import type { WebSocket, RawData } from 'ws';
import { z } from 'zod';

import type { Services } from '../container/container.js';
import { AuthService } from '../services/auth/auth.js';
import { EventBusService } from '../sse/event-bus.js';
import type { SessionEvent, UserEvent } from '../sse/event-bus.js';
import { SessionEventService } from '../services/session-event/session-event.js';
import type { SessionRef } from '../services/session/session.js';
import { sessionRef, SessionService } from '../services/session/session.js';
import { TerminalService } from '../services/terminal/terminal.js';

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

const terminalSubscribeMessageSchema = z.object({
  type: z.literal('terminal:subscribe'),
  sessionId: z.string(),
  terminalId: z.string(),
});

const terminalUnsubscribeMessageSchema = z.object({
  type: z.literal('terminal:unsubscribe'),
  sessionId: z.string(),
  terminalId: z.string(),
});

const terminalInputMessageSchema = z.object({
  type: z.literal('terminal:input'),
  sessionId: z.string(),
  terminalId: z.string(),
  data: z.string(),
});

const terminalResizeMessageSchema = z.object({
  type: z.literal('terminal:resize'),
  sessionId: z.string(),
  terminalId: z.string(),
  cols: z.number().int().min(1),
  rows: z.number().int().min(1),
});

const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  terminalSubscribeMessageSchema,
  terminalUnsubscribeMessageSchema,
  terminalInputMessageSchema,
  terminalResizeMessageSchema,
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

type WsTerminalOutput = {
  kind: 'terminal:output';
  sessionId: string;
  terminalId: string;
  data: string;
};

type WsTerminalExit = {
  kind: 'terminal:exit';
  sessionId: string;
  terminalId: string;
  exitCode: number;
};

type WsServerMessage = WsSessionEvent | WsUserEvent | WsSyncEvent | WsAuthOk | WsTerminalOutput | WsTerminalExit;

type HandleWebSocketInput = {
  socket: WebSocket;
  services: Services;
};

const AUTH_TIMEOUT_MS = 10_000;

const setupAuthenticatedSocket = (socket: WebSocket, userId: string, services: Services): void => {
  const eventBus = services.get(EventBusService);
  const sessionEventService = services.get(SessionEventService);
  const sessionService = services.get(SessionService);
  const terminalService = services.get(TerminalService);

  const subscriptions = new Map<string, () => void>();
  const terminalSubscriptions = new Map<string, (() => void)[]>();

  const send = (message: WsServerMessage): void => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const unsubscribeUser = eventBus.subscribeUser(userId, (event) => {
    send({ kind: 'user:event', event });
  });

  const handleSubscribe = async (sessionId: string, afterSequence?: number): Promise<void> => {
    let ref: SessionRef;
    try {
      const session = await sessionService.get({ userId, sessionId });
      ref = sessionRef(session);
    } catch {
      return;
    }

    subscriptions.get(sessionId)?.();

    const buffer: { event: SessionEvent; sequence: number }[] = [];
    let replayed = false;

    const unsubscribe = eventBus.subscribe(ref, (event, sequence) => {
      if (replayed) {
        send({ kind: 'session:event', sessionId, event, sequence });
      } else {
        buffer.push({ event, sequence });
      }
    });

    subscriptions.set(sessionId, unsubscribe);

    const historical = await sessionEventService.listBySession({
      ref,
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

  const termSubKey = (sessionId: string, terminalId: string): string =>
    `${sessionId}/${terminalId}`;

  const handleTerminalSubscribe = async (sessionId: string, terminalId: string): Promise<void> => {
    let ref: SessionRef;
    try {
      const session = await sessionService.get({ userId, sessionId });
      ref = sessionRef(session);
    } catch {
      return;
    }

    const key = termSubKey(sessionId, terminalId);
    const existing = terminalSubscriptions.get(key);
    if (existing) {
      for (const unsub of existing) unsub();
    }

    try {
      const unsubData = terminalService.onData(ref, terminalId, (data) => {
        send({ kind: 'terminal:output', sessionId, terminalId, data });
      });

      const unsubExit = terminalService.onExit(ref, terminalId, (exitCode) => {
        send({ kind: 'terminal:exit', sessionId, terminalId, exitCode });
        terminalSubscriptions.delete(key);
      });

      terminalSubscriptions.set(key, [unsubData, unsubExit]);
    } catch {
      // Terminal may not exist yet
    }
  };

  const handleTerminalUnsubscribe = (sessionId: string, terminalId: string): void => {
    const key = termSubKey(sessionId, terminalId);
    const unsubs = terminalSubscriptions.get(key);
    if (unsubs) {
      for (const unsub of unsubs) unsub();
      terminalSubscriptions.delete(key);
    }
  };

  const handleTerminalInput = async (sessionId: string, terminalId: string, data: string): Promise<void> => {
    let ref: SessionRef;
    try {
      const session = await sessionService.get({ userId, sessionId });
      ref = sessionRef(session);
    } catch {
      return;
    }

    try {
      terminalService.write(ref, terminalId, data);
    } catch {
      // Terminal may not exist
    }
  };

  const handleTerminalResize = async (sessionId: string, terminalId: string, cols: number, rows: number): Promise<void> => {
    let ref: SessionRef;
    try {
      const session = await sessionService.get({ userId, sessionId });
      ref = sessionRef(session);
    } catch {
      return;
    }

    try {
      terminalService.resize(ref, terminalId, cols, rows);
    } catch {
      // Terminal may not exist
    }
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
        case 'terminal:subscribe':
          handleTerminalSubscribe(message.sessionId, message.terminalId).catch(() => undefined);
          break;
        case 'terminal:unsubscribe':
          handleTerminalUnsubscribe(message.sessionId, message.terminalId);
          break;
        case 'terminal:input':
          handleTerminalInput(message.sessionId, message.terminalId, message.data).catch(() => undefined);
          break;
        case 'terminal:resize':
          handleTerminalResize(message.sessionId, message.terminalId, message.cols, message.rows).catch(() => undefined);
          break;
      }
    } catch (error) {
      console.error('[ws] message parse error:', error);
    }
  });

  socket.on('close', () => {
    unsubscribeUser();
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe();
    }
    subscriptions.clear();
    for (const unsubs of terminalSubscriptions.values()) {
      for (const unsub of unsubs) unsub();
    }
    terminalSubscriptions.clear();
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

export type { WsServerMessage, WsSessionEvent, WsUserEvent, WsSyncEvent, WsAuthOk, WsTerminalOutput, WsTerminalExit, HandleWebSocketInput };
export { handleWebSocket };
