import { describe, it, expect, vi } from 'vitest';

import type { AgentProvider } from './agent.js';

const createMockAgentProvider = (): AgentProvider => ({
  name: 'mock',
  run: async ({ onEvent }) => {
    await onEvent({
      type: 'message',
      message: {
        role: 'assistant',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
    });
    await onEvent({ type: 'completed', summary: 'Task complete' });
  },
  sendMessage: async () => {},
  stop: async () => {},
  abort: async () => {},
  isRunning: () => false,
});

describe('AgentProvider (mock)', () => {
  it('emits message and completed events', async () => {
    const provider = createMockAgentProvider();
    const events: unknown[] = [];

    await provider.run({
      sessionId: 'test-session',
      prompt: 'do something',
      cwd: '/tmp',
      onEvent: (event) => { events.push(event); },
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'message' });
    expect(events[1]).toMatchObject({ type: 'completed', summary: 'Task complete' });
  });

  it('handles abort', async () => {
    const provider = createMockAgentProvider();
    await expect(provider.abort('test-session')).resolves.not.toThrow();
  });

  it('handles sendMessage', async () => {
    const provider = createMockAgentProvider();
    await expect(
      provider.sendMessage({ sessionId: 'test', message: 'hello' }),
    ).resolves.not.toThrow();
  });
});
