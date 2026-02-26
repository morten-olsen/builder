import type { Command } from 'commander';
import { RepoService, SessionService } from '@morten-olsen/builder-server';

import { requireAuth } from '../cli.auth-store.js';
import { createCliContext } from '../cli.context.js';
import { isJson, printJson, printTable } from '../cli.output.js';

const registerRepoCommands = (program: Command): void => {
  const repo = program.command('repo').description('Repo management commands');

  repo
    .command('create')
    .description('Create a new repo')
    .requiredOption('--id <id>', 'Repo ID (lowercase slug)')
    .requiredOption('--name <name>', 'Repo name')
    .requiredOption('--url <url>', 'Repository URL')
    .option('--branch <branch>', 'Default branch')
    .option('--identity <id>', 'Default identity ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ id: string; name: string; url: string; branch?: string; identity?: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const result = await repoService.create({
          id: opts.id,
          userId,
          name: opts.name,
          repoUrl: opts.url,
          defaultBranch: opts.branch,
          defaultIdentityId: opts.identity,
        });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Repo created: ${result.id}`);
          console.log(`  name:     ${result.name}`);
          console.log(`  url:      ${result.repoUrl}`);
          console.log(`  branch:   ${result.defaultBranch ?? 'none'}`);
          console.log(`  identity: ${result.defaultIdentityId ?? 'none'}`);
        }
      } finally {
        await cleanup();
      }
    });

  repo
    .command('list')
    .description('List all repos')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const repos = await repoService.list(userId);

        if (isJson(this)) {
          printJson(repos);
        } else {
          printTable(repos, [
            { header: 'ID', key: 'id' },
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

  repo
    .command('get')
    .description('Get repo details')
    .argument('<id>', 'Repo ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const result = await repoService.get({ userId, repoId: id });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`id:       ${result.id}`);
          console.log(`name:     ${result.name}`);
          console.log(`url:      ${result.repoUrl}`);
          console.log(`branch:   ${result.defaultBranch ?? 'none'}`);
          console.log(`identity: ${result.defaultIdentityId ?? 'none'}`);
          console.log(`created:  ${result.createdAt}`);
          console.log(`updated:  ${result.updatedAt}`);
        }
      } finally {
        await cleanup();
      }
    });

  repo
    .command('update')
    .description('Update a repo')
    .argument('<id>', 'Repo ID')
    .option('--name <name>', 'Repo name')
    .option('--url <url>', 'Repository URL')
    .option('--branch <branch>', 'Default branch')
    .option('--identity <id>', 'Default identity ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command, id: string) {
      const opts = this.opts<{ name?: string; url?: string; branch?: string; identity?: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const result = await repoService.update({
          userId,
          repoId: id,
          name: opts.name,
          repoUrl: opts.url,
          defaultBranch: opts.branch,
          defaultIdentityId: opts.identity,
        });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Repo updated: ${result.id}`);
          console.log(`  name:     ${result.name}`);
          console.log(`  url:      ${result.repoUrl}`);
          console.log(`  branch:   ${result.defaultBranch ?? 'none'}`);
          console.log(`  identity: ${result.defaultIdentityId ?? 'none'}`);
        }
      } finally {
        await cleanup();
      }
    });

  repo
    .command('delete')
    .description('Delete a repo')
    .argument('<id>', 'Repo ID')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        await repoService.delete({ userId, repoId: id });
        console.log(`Repo ${id} deleted.`);
      } finally {
        await cleanup();
      }
    });

  repo
    .command('sessions')
    .description('List sessions for a repo')
    .argument('<id>', 'Repo ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        // Verify repo ownership
        await services.get(RepoService).get({ userId, repoId: id });
        const sessions = await services.get(SessionService).listByRepo({ userId, repoId: id });

        if (isJson(this)) {
          printJson(sessions);
        } else {
          printTable(sessions, [
            { header: 'ID', key: 'id' },
            { header: 'Status', key: 'status' },
            { header: 'Branch', key: 'branch' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });
};

export { registerRepoCommands };
