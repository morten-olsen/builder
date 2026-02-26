import type { Services } from '../../container/container.js';

import { AgentNotFoundError } from './agent.errors.js';

type AgentMessage = {
  role: 'assistant' | 'user' | 'system' | 'result';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type AgentEvent =
  | { type: 'message'; message: AgentMessage }
  | { type: 'tool_use'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; output: unknown }
  | { type: 'waiting_for_input'; prompt: string }
  | { type: 'completed'; summary: string }
  | { type: 'error'; error: string };

type AgentRunInput = {
  sessionId: string;
  prompt: string;
  cwd: string;
  onEvent: (event: AgentEvent) => void | Promise<void>;
  abortSignal?: AbortSignal;
  resume?: boolean;
  model?: string;
};

type AgentSendInput = {
  sessionId: string;
  message: string;
};

type AgentProviderModel = {
  id: string;
  displayName: string;
};

type AgentProvider = {
  name: string;
  run: (input: AgentRunInput) => Promise<void>;
  sendMessage: (input: AgentSendInput) => Promise<void>;
  stop: (sessionId: string) => Promise<void>;
  abort: (sessionId: string) => Promise<void>;
  isRunning: (sessionId: string) => boolean;
  getModels?: () => Promise<AgentProviderModel[]>;
};

class AgentService {
  #services: Services;
  #providers = new Map<string, AgentProvider>();

  constructor(services: Services) {
    this.#services = services;
  }

  registerProvider = (provider: AgentProvider): void => {
    this.#providers.set(provider.name, provider);
  };

  getProvider = (name?: string): AgentProvider => {
    const providerName = name ?? this.#services.config.agent.provider;
    const provider = this.#providers.get(providerName);
    if (!provider) {
      throw new AgentNotFoundError(providerName);
    }
    return provider;
  };

  getProviderNames = (): string[] => {
    return [...this.#providers.keys()];
  };
}

export type {
  AgentMessage,
  AgentEvent,
  AgentRunInput,
  AgentSendInput,
  AgentProvider,
  AgentProviderModel,
};
export { AgentService };
