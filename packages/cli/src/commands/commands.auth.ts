import type { Command } from 'commander';
import { AuthService } from '@morten-olsen/builder-server';

import { clearAuth, requireAuth, saveAuth } from '../cli.auth-store.js';
import { createCliContext } from '../cli.context.js';
import { isJson, printJson } from '../cli.output.js';

const registerAuthCommands = (program: Command): void => {
  const auth = program.command('auth').description('Authentication commands');

  auth
    .command('register')
    .description('Register a new account')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ email: string; password: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        const result = await authService.register({ email: opts.email, password: opts.password });
        saveAuth({ token: result.token, userId: result.user.id, email: result.user.email });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Registered and logged in as ${result.user.email}`);
        }
      } finally {
        await cleanup();
      }
    });

  auth
    .command('login')
    .description('Log in to an existing account')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ email: string; password: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        const result = await authService.login({ email: opts.email, password: opts.password });
        saveAuth({ token: result.token, userId: result.user.id, email: result.user.email });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Logged in as ${result.user.email}`);
        }
      } finally {
        await cleanup();
      }
    });

  auth
    .command('me')
    .description('Show current user')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const authService = services.get(AuthService);
        const user = await authService.getMe(userId);

        if (isJson(this)) {
          printJson(user);
        } else {
          console.log(`id:    ${user.id}`);
          console.log(`email: ${user.email}`);
          console.log(`since: ${user.createdAt}`);
        }
      } finally {
        await cleanup();
      }
    });

  auth
    .command('logout')
    .description('Clear saved credentials')
    .action(async () => {
      clearAuth();
      console.log('Logged out.');
    });
};

export { registerAuthCommands };
