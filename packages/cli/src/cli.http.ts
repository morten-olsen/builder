import type { SessionEvent } from '@morten-olsen/builder-server';

type HttpClient = {
  post: (path: string, body: unknown) => Promise<unknown>;
  streamSSE: (
    path: string,
    onEvent: (event: SessionEvent) => void,
    until: (event: SessionEvent) => boolean,
  ) => Promise<void>;
};

const createHttpClient = (baseUrl: string, token: string): HttpClient => {
  const post = async (path: string, body: unknown): Promise<unknown> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response.json();
  };

  const streamSSE = async (
    path: string,
    onEvent: (event: SessionEvent) => void,
    until: (event: SessionEvent) => boolean,
  ): Promise<void> => {
    const controller = new AbortController();

    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('No response body for SSE stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            data = line.slice(6).trim();
          } else if (line === '' && eventType && data) {
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              const event = { type: eventType, data: parsed } as SessionEvent;
              onEvent(event);
              if (until(event)) {
                controller.abort();
                return;
              }
            } catch {
              // Skip malformed events
            }
            eventType = '';
            data = '';
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      throw error;
    }
  };

  return { post, streamSSE };
};

export type { HttpClient };
export { createHttpClient };
