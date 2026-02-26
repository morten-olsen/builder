import crypto from 'node:crypto';

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Query, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';

import type { AgentProvider, AgentRunInput, AgentSendInput } from './agent.js';
import type { MessageQueue } from './agent.queue.js';
import { createMessageQueue } from './agent.queue.js';

type SessionState = {
  query: Query;
  queue: MessageQueue<SDKUserMessage>;
  abortController: AbortController;
};

/** The SDK requires a valid UUID for sessionId/resume. Derive one deterministically from the session key via UUID v5. */
const toSessionUUID = (key: string): string => {
  const hash = crypto.createHash('sha1').update(key).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const createClaudeAgentProvider = (apiKey: string, model: string): AgentProvider => {
  const sessions = new Map<string, SessionState>();

  const run = async (input: AgentRunInput): Promise<void> => {
    const abortController = new AbortController();

    if (input.abortSignal) {
      input.abortSignal.addEventListener('abort', () => abortController.abort());
    }

    const { CLAUDECODE: _nested, CLAUDE_CODE_ENTRYPOINT: _entrypoint, ...parentEnv } = process.env;
    const env = apiKey ? { ...parentEnv, ANTHROPIC_API_KEY: apiKey } : { ...parentEnv };

    const queue = createMessageQueue<SDKUserMessage>();

    const sdkSessionId = toSessionUUID(input.sessionId);

    queue.push({
      type: 'user',
      message: { role: 'user', content: input.prompt },
      parent_tool_use_id: null,
      session_id: sdkSessionId,
    });

    const sessionOptions = input.resume
      ? { resume: sdkSessionId }
      : { sessionId: sdkSessionId };

    const q = query({
      prompt: queue,
      options: {
        ...sessionOptions,
        cwd: input.cwd,
        abortController,
        model: input.model ?? model,
        permissionMode: 'acceptEdits',
        allowedTools: ['Edit', 'Write', 'Bash', 'Read', 'Glob', 'Grep'],
        env,
      },
    });

    const state: SessionState = { query: q, queue, abortController };
    sessions.set(input.sessionId, state);

    let completed = false;

    try {
      for await (const message of q) {
        if (abortController.signal.aborted) break;

        const didComplete = await handleMessage(message, input);
        if (didComplete) completed = true;
      }

      if (!abortController.signal.aborted && !completed) {
        await input.onEvent({ type: 'completed', summary: 'Session ended' });
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }
      await input.onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown agent error',
      });
    } finally {
      sessions.delete(input.sessionId);
    }
  };

  const sendMessage = async (input: AgentSendInput): Promise<void> => {
    const state = sessions.get(input.sessionId);
    if (!state) throw new Error('Session not running');
    state.queue.push({
      type: 'user',
      message: { role: 'user', content: input.message },
      parent_tool_use_id: null,
      session_id: toSessionUUID(input.sessionId),
    });
  };

  const stop = async (sessionId: string): Promise<void> => {
    const state = sessions.get(sessionId);
    if (state) {
      state.queue.end();
    }
  };

  const abort = async (sessionId: string): Promise<void> => {
    const state = sessions.get(sessionId);
    if (state) {
      state.abortController.abort();
      state.queue.end();
      state.query.close();
      sessions.delete(sessionId);
    }
  };

  const isRunning = (sessionId: string): boolean => sessions.has(sessionId);

  return {
    name: 'claude',
    run,
    sendMessage,
    stop,
    abort,
    isRunning,
  };
};

const handleMessage = async (message: SDKMessage, input: AgentRunInput): Promise<boolean> => {
  if (message.type === 'assistant') {
    const content = message.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text') {
          await input.onEvent({
            type: 'message',
            message: {
              role: 'assistant',
              content: block.text,
              timestamp: new Date().toISOString(),
            },
          });
        } else if (block.type === 'tool_use') {
          await input.onEvent({
            type: 'tool_use',
            tool: block.name,
            input: block.input,
          });
        }
      }
    }
  } else if (message.type === 'result') {
    if (message.subtype === 'success' && 'result' in message) {
      await input.onEvent({
        type: 'completed',
        summary: message.result,
      });
      return true;
    } else if (message.subtype !== 'success') {
      await input.onEvent({
        type: 'error',
        error: 'errors' in message ? message.errors.join('; ') : 'Agent execution failed',
      });
    }
  }
  return false;
};

export { createClaudeAgentProvider };
