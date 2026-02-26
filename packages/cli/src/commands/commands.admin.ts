import type { Command } from 'commander';
import {
  AuthService,
  DatabaseService,
  IdentityService,
  RepoService,
  SessionService,
} from '@morten-olsen/builder-server';

import { createCliContext } from '../cli.context.js';
import { isJson, printJson, printTable } from '../cli.output.js';
import { promptPasswordWithConfirm } from '../cli.prompt.js';

const registerAdminCommands = (program: Command): void => {
  const admin = program.command('admin').description('Admin commands (all users)');

  admin
    .command('users')
    .description('List all users')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        const users = await authService.listUsers();

        if (isJson(this)) {
          printJson(users);
        } else {
          printTable(users, [
            { header: 'ID', key: 'id' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  admin
    .command('repos')
    .description('List all repos')
    .option('--user <id>', 'Filter by user ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ user?: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const repoService = services.get(RepoService);
        const repos = await repoService.listAll(opts.user);

        if (isJson(this)) {
          printJson(repos);
        } else {
          printTable(repos, [
            { header: 'ID', key: 'id' },
            { header: 'User', key: 'userId' },
            { header: 'Name', key: 'name' },
            { header: 'URL', key: 'repoUrl' },
            { header: 'Branch', key: 'defaultBranch' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  admin
    .command('identities')
    .description('List all identities')
    .option('--user <id>', 'Filter by user ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ user?: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const identityService = services.get(IdentityService);
        const identities = await identityService.listAll(opts.user);

        if (isJson(this)) {
          printJson(identities);
        } else {
          printTable(identities, [
            { header: 'ID', key: 'id' },
            { header: 'User', key: 'userId' },
            { header: 'Name', key: 'name' },
            { header: 'Git Name', key: 'gitAuthorName' },
            { header: 'Git Email', key: 'gitAuthorEmail' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  admin
    .command('sessions')
    .description('List all sessions')
    .option('--user <id>', 'Filter by user ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ user?: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const sessionService = services.get(SessionService);
        const sessions = await sessionService.listAll(opts.user);

        if (isJson(this)) {
          printJson(sessions);
        } else {
          printTable(sessions, [
            { header: 'ID', key: 'id' },
            { header: 'User', key: 'userId' },
            { header: 'Repo', key: 'repoId' },
            { header: 'Status', key: 'status' },
            { header: 'Branch', key: 'branch' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  admin
    .command('reset-password')
    .description('Reset a user password')
    .requiredOption('--user <userId>', 'User ID')
    .option('--password <password>', 'New password (omit to enter securely)')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ user: string; password?: string }>();
      const newPassword = opts.password ?? (await promptPasswordWithConfirm('New password: '));
      const { services, cleanup } = await createCliContext();
      try {
        const authService = services.get(AuthService);
        await authService.adminResetPassword({ userId: opts.user, newPassword });

        if (isJson(this)) {
          printJson({ success: true });
        } else {
          console.log('Password reset successfully.');
        }
      } finally {
        await cleanup();
      }
    });

  admin
    .command('set-worktree-base')
    .description('Set a custom worktree base directory for a user')
    .requiredOption('--user <id>', 'User ID')
    .requiredOption('--path <path>', 'Worktree base directory (use "default" to clear)')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ user: string; path: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const worktreeBase = opts.path === 'default' ? null : opts.path;
        const db = await services.get(DatabaseService).getInstance();

        const user = await db
          .selectFrom('users')
          .select('id')
          .where('id', '=', opts.user)
          .executeTakeFirst();

        if (!user) {
          throw new Error(`User "${opts.user}" not found`);
        }

        await db
          .updateTable('users')
          .set({ worktree_base: worktreeBase, updated_at: new Date().toISOString() })
          .where('id', '=', opts.user)
          .execute();

        if (isJson(this)) {
          printJson({ success: true, worktreeBase });
        } else {
          if (worktreeBase) {
            console.log(`Worktree base set to: ${worktreeBase}`);
          } else {
            console.log('Worktree base reset to default.');
          }
        }
      } finally {
        await cleanup();
      }
    });
};

export { registerAdminCommands };
