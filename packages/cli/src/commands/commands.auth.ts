import type { Command } from 'commander';
import { AuthService } from '@morten-olsen/builder-server';

import { clearAuth, requireAuth, saveAuth } from '../cli.auth-store.js';
import { createCliContext } from '../cli.context.js';
import { isJson, printJson } from '../cli.output.js';
import { promptPassword, promptPasswordWithConfirm } from '../cli.prompt.js';

const registerAuthCommands = (program: Command): void => {
  const auth = program.command('auth').description('Authentication commands');

  auth
    .command('register')
    .description('Register a new account')
    .requiredOption('--id <id>', 'User ID (slug)')
    .option('--password <password>', 'Password (omit to enter securely)')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ id: string; password?: string }>();
      const password = opts.password ?? (await promptPasswordWithConfirm('Password: '));
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        const result = await authService.register({ id: opts.id, password });
        saveAuth({ token: result.token, userId: result.user.id });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Registered and logged in as ${result.user.id}`);
        }
      } finally {
        await cleanup();
      }
    });

  auth
    .command('login')
    .description('Log in to an existing account')
    .requiredOption('--id <id>', 'User ID')
    .option('--password <password>', 'Password (omit to enter securely)')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ id: string; password?: string }>();
      const password = opts.password ?? (await promptPassword('Password: '));
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        const result = await authService.login({ id: opts.id, password });
        saveAuth({ token: result.token, userId: result.user.id });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Logged in as ${result.user.id}`);
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
          console.log(`since: ${user.createdAt}`);
        }
      } finally {
        await cleanup();
      }
    });

  auth
    .command('change-password')
    .description('Change your password')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const currentPassword = await promptPassword('Current password: ');
        const newPassword = await promptPasswordWithConfirm('New password: ');
        const authService = services.get(AuthService);
        await authService.changePassword({ userId, currentPassword, newPassword });

        if (isJson(this)) {
          printJson({ success: true });
        } else {
          console.log('Password changed successfully.');
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
