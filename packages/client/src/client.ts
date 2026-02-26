import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './api.generated.js';
import type { SessionEvent, UserEvent, WsServerMessage, WsClientMessage } from './client.events.js';

type ClientOptions = {
  baseUrl: string;
  token?: string;
};

type SequencedSessionEvent = SessionEvent & { sequence?: number };

type StreamEventsOptions = {
  afterSequence?: number;
  signal?: AbortSignal;
};

type WebSocketCallbacks = {
  onSessionEvent: (sessionId: string, event: SequencedSessionEvent) => void;
  onUserEvent: (event: UserEvent) => void;
  onSync: (sessionId: string, lastSequence: number) => void;
  onTerminalOutput?: (sessionId: string, terminalId: string, data: string) => void;
  onTerminalExit?: (sessionId: string, terminalId: string, exitCode: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
};

type WebSocketConnection = {
  subscribe: (sessionId: string, afterSequence?: number) => void;
  unsubscribe: (sessionId: string) => void;
  terminalSubscribe: (sessionId: string, terminalId: string) => void;
  terminalUnsubscribe: (sessionId: string, terminalId: string) => void;
  terminalInput: (sessionId: string, terminalId: string, data: string) => void;
  terminalResize: (sessionId: string, terminalId: string, cols: number, rows: number) => void;
  close: () => void;
};

type BuilderClient = {
  api: ReturnType<typeof createClient<paths>>;
  setToken: (token: string) => void;
  connectWebSocket: (callbacks: WebSocketCallbacks) => WebSocketConnection;
  streamEvents: (
    sessionId: string,
    onEvent: (event: SequencedSessionEvent) => void,
    untilOrOptions?: ((event: SessionEvent) => boolean) | StreamEventsOptions,
    until?: (event: SessionEvent) => boolean,
  ) => Promise<void>;
  streamUserEvents: (
    onEvent: (event: UserEvent) => void,
    streamOptions?: { signal?: AbortSignal },
  ) => Promise<void>;
};

const createBuilderClient = (options: ClientOptions): BuilderClient => {
  let token = options.token;

  const authMiddleware: Middleware = {
    onRequest: ({ request }) => {
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
  };

  const api = createClient<paths>({ baseUrl: options.baseUrl });
  api.use(authMiddleware);

  const setToken = (newToken: string): void => {
    token = newToken;
  };

  const connectWebSocket = (callbacks: WebSocketCallbacks): WebSocketConnection => {
    let wsUrl: string;

    if (options.baseUrl && /^https?:\/\//.test(options.baseUrl)) {
      const protocol = options.baseUrl.startsWith('https') ? 'wss' : 'ws';
      const host = options.baseUrl.replace(/^https?:\/\//, '');
      wsUrl = `${protocol}://${host}/api/ws`;
    } else {
      const loc = globalThis.location;
      const protocol = loc.protocol === 'https:' ? 'wss' : 'ws';
      wsUrl = `${protocol}://${loc.host}${options.baseUrl}/api/ws`;
    }

    const ws = new WebSocket(wsUrl);
    let authenticated = false;

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as WsServerMessage;

        if (message.kind === 'auth:ok') {
          authenticated = true;
          callbacks.onOpen?.();
          return;
        }

        if (!authenticated) return;

        switch (message.kind) {
          case 'session:event':
            callbacks.onSessionEvent(
              message.sessionId,
              { ...message.event, sequence: message.sequence } as SequencedSessionEvent,
            );
            break;
          case 'user:event':
            callbacks.onUserEvent(message.event);
            break;
          case 'sync':
            callbacks.onSync(message.sessionId, message.lastSequence);
            break;
          case 'terminal:output':
            callbacks.onTerminalOutput?.(message.sessionId, message.terminalId, message.data);
            break;
          case 'terminal:exit':
            callbacks.onTerminalExit?.(message.sessionId, message.terminalId, message.exitCode);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      callbacks.onClose?.();
    });

    ws.addEventListener('error', (event) => {
      callbacks.onError?.(event);
    });

    const sendMessage = (message: WsClientMessage): void => {
      if (ws.readyState === WebSocket.OPEN && authenticated) {
        ws.send(JSON.stringify(message));
      }
    };

    const subscribe = (sessionId: string, afterSequence?: number): void => {
      sendMessage({ type: 'subscribe', sessionId, afterSequence });
    };

    const unsubscribe = (sessionId: string): void => {
      sendMessage({ type: 'unsubscribe', sessionId });
    };

    const terminalSubscribe = (sessionId: string, terminalId: string): void => {
      sendMessage({ type: 'terminal:subscribe', sessionId, terminalId });
    };

    const terminalUnsubscribe = (sessionId: string, terminalId: string): void => {
      sendMessage({ type: 'terminal:unsubscribe', sessionId, terminalId });
    };

    const terminalInput = (sessionId: string, terminalId: string, data: string): void => {
      sendMessage({ type: 'terminal:input', sessionId, terminalId, data });
    };

    const terminalResize = (sessionId: string, terminalId: string, cols: number, rows: number): void => {
      sendMessage({ type: 'terminal:resize', sessionId, terminalId, cols, rows });
    };

    const close = (): void => {
      ws.close();
    };

    return { subscribe, unsubscribe, terminalSubscribe, terminalUnsubscribe, terminalInput, terminalResize, close };
  };

  const streamEvents = async (
    sessionId: string,
    onEvent: (event: SequencedSessionEvent) => void,
    untilOrOptions?: ((event: SessionEvent) => boolean) | StreamEventsOptions,
    until?: (event: SessionEvent) => boolean,
  ): Promise<void> => {
    let streamOptions: StreamEventsOptions = {};
    let untilFn: ((event: SessionEvent) => boolean) | undefined = until;

    if (typeof untilOrOptions === 'function') {
      untilFn = untilOrOptions;
    } else if (untilOrOptions) {
      streamOptions = untilOrOptions;
    }

    let url = `${options.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/events`;
    if (streamOptions.afterSequence !== undefined) {
      url += `?after=${streamOptions.afterSequence}`;
    }

    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers, signal: streamOptions.signal });
    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
    }

    const body = response.body;
    if (!body) {
      return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType: string | undefined;
        let eventId: string | undefined;

        for (const line of lines) {
          if (line.startsWith('id: ')) {
            eventId = line.slice(4).trim();
          } else if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            const data: unknown = JSON.parse(line.slice(6));
            const sequence = eventId ? parseInt(eventId, 10) : undefined;
            const event = { type: eventType, data, sequence } as SequencedSessionEvent;
            onEvent(event);
            if (untilFn?.(event)) {
              return;
            }
            eventType = undefined;
            eventId = undefined;
          } else if (line === '') {
            eventType = undefined;
            eventId = undefined;
          }
        }
      }
    } catch (error) {
      if (streamOptions.signal?.aborted) return;
      throw error;
    } finally {
      reader.cancel();
    }
  };

  const streamUserEvents = async (
    onEvent: (event: UserEvent) => void,
    streamOptions?: { signal?: AbortSignal },
  ): Promise<void> => {
    const url = `${options.baseUrl}/api/events`;

    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers, signal: streamOptions?.signal });
    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
    }

    const body = response.body;
    if (!body) return;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType: string | undefined;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            const data: unknown = JSON.parse(line.slice(6));
            onEvent({ type: eventType, data } as UserEvent);
            eventType = undefined;
          } else if (line === '') {
            eventType = undefined;
          }
        }
      }
    } catch (error) {
      if (streamOptions?.signal?.aborted) return;
      throw error;
    } finally {
      reader.cancel();
    }
  };

  return { api, setToken, connectWebSocket, streamEvents, streamUserEvents };
};

export type {
  ClientOptions,
  BuilderClient,
  SessionEvent,
  UserEvent,
  SequencedSessionEvent,
  StreamEventsOptions,
  WebSocketCallbacks,
  WebSocketConnection,
};
export { createBuilderClient };
