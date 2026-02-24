import type { Config } from '@morten-olsen/builder-server';
import {
  AgentService,
  Services,
  createClaudeAgentProvider,
  createConfig,
  destroy,
} from '@morten-olsen/builder-server';

type CliContext = {
  services: Services;
  config: Config;
  cleanup: () => Promise<void>;
};

const createCliContext = async (): Promise<CliContext> => {
  const config = createConfig();
  const services = new Services(config);

  const agentService = services.get(AgentService);
  agentService.registerProvider(createClaudeAgentProvider(config.agent.apiKey, config.agent.model));

  const cleanup = async (): Promise<void> => {
    await services[destroy]();
  };

  return { services, config, cleanup };
};

export type { CliContext };
export { createCliContext };
