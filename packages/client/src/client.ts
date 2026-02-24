import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './api.generated.js';
import type { SessionEvent, UserEvent } from './client.events.js';

type ClientOptions = {
  baseUrl: string;
  token?: string;
};

type SequencedSessionEvent = SessionEvent & { sequence?: number };

type StreamEventsOptions = {
  afterSequence?: number;
};

type BuilderClient = {
  api: ReturnType<typeof createClient<paths>>;
  setToken: (token: string) => void;
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

    let url = `${options.baseUrl}/sessions/${encodeURIComponent(sessionId)}/events`;
    if (streamOptions.afterSequence !== undefined) {
      url += `?after=${streamOptions.afterSequence}`;
    }

    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
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
            reader.cancel();
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
  };

  const streamUserEvents = async (
    onEvent: (event: UserEvent) => void,
    streamOptions?: { signal?: AbortSignal },
  ): Promise<void> => {
    const url = `${options.baseUrl}/events`;

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
    }
  };

  return { api, setToken, streamEvents, streamUserEvents };
};

export type { ClientOptions, BuilderClient, SessionEvent, UserEvent, SequencedSessionEvent, StreamEventsOptions };
export { createBuilderClient };
