import type { Config } from '@morten-olsen/builder-server';
import {
  AgentService,
  NotificationService,
  Services,
  createClaudeAgentProvider,
  createConfig,
  createNtfyProvider,
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

  const notificationService = services.get(NotificationService);
  notificationService.registerProvider(createNtfyProvider());

  const cleanup = async (): Promise<void> => {
    await services[destroy]();
  };

  return { services, config, cleanup };
};

export type { CliContext };
export { createCliContext };
