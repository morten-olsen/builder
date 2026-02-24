import 'dotenv/config';

import { createApp } from './app/app.js';
import { registerAllRoutes } from './app/app.routes.js';
import { createConfig } from './config/config.js';
import { Services, destroy } from './container/container.js';
import { createClaudeAgentProvider } from './services/agent/agent.claude.js';
import { AgentService } from './services/agent/agent.js';
import { DatabaseService } from './services/database/database.js';

const start = async (): Promise<void> => {
  const config = createConfig();
  const services = new Services(config);

  const agentService = services.get(AgentService);
  agentService.registerProvider(createClaudeAgentProvider(config.agent.apiKey, config.agent.model));

  const db = await services.get(DatabaseService).getInstance();
  await db
    .updateTable('sessions')
    .set({ status: 'failed', error: 'Server restarted', updated_at: new Date().toISOString() })
    .where('status', 'in', ['running', 'idle'])
    .execute();

  const app = await createApp({ services, config });
  registerAllRoutes(app);

  const port = config.server.port;
  const host = config.server.host;

  await app.listen({ port, host });
  console.log(`Server listening on ${host}:${port}`);

  const shutdown = async (): Promise<void> => {
    console.log('Shutting down...');
    await app.close();
    await services[destroy]();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
