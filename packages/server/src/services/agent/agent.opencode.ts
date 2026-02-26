import { createOpencode } from '@opencode-ai/sdk';
import type { OpencodeClient, TextPart, ToolPart } from '@opencode-ai/sdk';

import type { AgentProvider, AgentRunInput, AgentSendInput } from './agent.js';

type OpenCodeSession = {
  opcSessionId: string;
  directory: string;
  abortController: AbortController;
};

type SharedServer = {
  client: OpencodeClient;
  close: () => void;
  refCount: number;
};

let sharedServer: SharedServer | undefined;

const getOrCreateServer = async (): Promise<SharedServer> => {
  if (sharedServer) {
    sharedServer.refCount++;
    return sharedServer;
  }

  const { client, server } = await createOpencode();

  sharedServer = {
    client,
    close: server.close,
    refCount: 1,
  };

  return sharedServer;
};

const releaseServer = (): void => {
  if (!sharedServer) return;
  sharedServer.refCount--;
  if (sharedServer.refCount <= 0) {
    sharedServer.close();
    sharedServer = undefined;
  }
};

const isTextPart = (part: { type: string }): part is TextPart =>
  part.type === 'text';

const isToolPart = (part: { type: string }): part is ToolPart =>
  part.type === 'tool';

const createOpenCodeAgentProvider = (): AgentProvider => {
  const sessions = new Map<string, OpenCodeSession>();

  const run = async (input: AgentRunInput): Promise<void> => {
    const abortController = new AbortController();

    if (input.abortSignal) {
      input.abortSignal.addEventListener('abort', () => abortController.abort());
    }

    const server = await getOrCreateServer();
    const client = server.client;

    try {
      const createResult = await client.session.create({
        body: { title: input.sessionId },
        query: { directory: input.cwd },
      });
      const opcSession = createResult.data;
      if (!opcSession) {
        throw new Error('Failed to create OpenCode session');
      }

      const state: OpenCodeSession = {
        opcSessionId: opcSession.id,
        directory: input.cwd,
        abortController,
      };
      sessions.set(input.sessionId, state);

      const modelBody = input.model
        ? parseModel(input.model)
        : undefined;

      const promptResult = await client.session.prompt({
        path: { id: opcSession.id },
        query: { directory: input.cwd },
        body: {
          parts: [{ type: 'text', text: input.prompt }],
          ...(modelBody ? { model: modelBody } : {}),
        },
      });

      if (abortController.signal.aborted) return;

      const response = promptResult.data;
      if (response) {
        for (const part of response.parts) {
          if (abortController.signal.aborted) break;

          if (isTextPart(part)) {
            await input.onEvent({
              type: 'message',
              message: {
                role: 'assistant',
                content: part.text,
                timestamp: new Date().toISOString(),
              },
            });
          } else if (isToolPart(part)) {
            await input.onEvent({
              type: 'tool_use',
              tool: part.tool,
              input: part.metadata ?? {},
            });

            if (part.state.status === 'completed') {
              await input.onEvent({
                type: 'tool_result',
                tool: part.tool,
                output: part.state.output,
              });
            } else if (part.state.status === 'error') {
              await input.onEvent({
                type: 'tool_result',
                tool: part.tool,
                output: part.state.error,
              });
            }
          }
        }
      }

      if (!abortController.signal.aborted) {
        const summaryText = response?.parts
          .filter(isTextPart)
          .map((p) => p.text)
          .join('\n') ?? 'Session completed';

        await input.onEvent({
          type: 'completed',
          summary: summaryText.slice(0, 500),
        });
      }
    } catch (error) {
      if (abortController.signal.aborted) return;

      await input.onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown OpenCode error',
      });
    } finally {
      sessions.delete(input.sessionId);
      releaseServer();
    }
  };

  const sendMessage = async (input: AgentSendInput): Promise<void> => {
    const state = sessions.get(input.sessionId);
    if (!state) throw new Error('Session not running');
    if (!sharedServer) throw new Error('OpenCode server not running');

    await sharedServer.client.session.prompt({
      path: { id: state.opcSessionId },
      query: { directory: state.directory },
      body: {
        parts: [{ type: 'text', text: input.message }],
      },
    });
  };

  const stop = async (sessionId: string): Promise<void> => {
    const state = sessions.get(sessionId);
    if (state && sharedServer) {
      await sharedServer.client.session.abort({
        path: { id: state.opcSessionId },
      });
    }
  };

  const abort = async (sessionId: string): Promise<void> => {
    const state = sessions.get(sessionId);
    if (state) {
      state.abortController.abort();
      if (sharedServer) {
        try {
          await sharedServer.client.session.abort({
            path: { id: state.opcSessionId },
          });
        } catch {
          // Session may already be stopped
        }
      }
      sessions.delete(sessionId);
    }
  };

  const isRunning = (sessionId: string): boolean => sessions.has(sessionId);

  const getModels = async (): Promise<{ id: string; displayName: string }[]> => {
    const server = await getOrCreateServer();
    try {
      const result = await server.client.provider.list();
      const data = result.data;
      if (!data) return [];

      return data.all.flatMap((p) =>
        Object.values(p.models).map((m) => ({
          id: `${p.id}/${m.id}`,
          displayName: `${m.name} (${p.name})`,
        })),
      );
    } finally {
      releaseServer();
    }
  };

  return {
    name: 'opencode',
    run,
    sendMessage,
    stop,
    abort,
    isRunning,
    getModels,
  };
};

const parseModel = (model: string): { providerID: string; modelID: string } => {
  const slashIndex = model.indexOf('/');
  if (slashIndex > 0) {
    return { providerID: model.slice(0, slashIndex), modelID: model.slice(slashIndex + 1) };
  }
  return { providerID: 'anthropic', modelID: model };
};

export { createOpenCodeAgentProvider };
