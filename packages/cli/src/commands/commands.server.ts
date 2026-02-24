import type { Command } from 'commander';
import { fastifyStatic } from '@fastify/static';
import { frontendPath } from '@morten-olsen/builder-web';
import {
  createApp,
  destroy,
  registerAllRoutes,
} from '@morten-olsen/builder-server';

import { createCliContext } from '../cli.context.js';

const registerServerCommands = (program: Command): void => {
  const server = program.command('server').description('Server commands');

  server
    .command('start')
    .description('Start the HTTP server')
    .action(async () => {
      const { services, config } = await createCliContext();

      const app = await createApp({ services, config });
      registerAllRoutes(app);
      app.register(fastifyStatic, {
        root: frontendPath,
      })

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

      process.on('SIGINT', () => void shutdown());
      process.on('SIGTERM', () => void shutdown());
    });
};

export { registerServerCommands };
