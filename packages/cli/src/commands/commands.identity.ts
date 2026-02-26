import type { Command } from 'commander';
import { IdentityService } from '@morten-olsen/builder-server';

import { requireAuth } from '../cli.auth-store.js';
import { createCliContext } from '../cli.context.js';
import { isJson, printJson, printTable } from '../cli.output.js';

const registerIdentityCommands = (program: Command): void => {
  const identity = program.command('identity').description('Identity management commands');

  identity
    .command('create')
    .description('Create a new identity')
    .requiredOption('--id <id>', 'Identity ID (lowercase slug)')
    .requiredOption('--name <name>', 'Identity name')
    .requiredOption('--git-name <name>', 'Git author name')
    .requiredOption('--git-email <email>', 'Git author email')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ id: string; name: string; gitName: string; gitEmail: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const identityService = services.get(IdentityService);
        const result = await identityService.create({
          id: opts.id,
          userId,
          name: opts.name,
          gitAuthorName: opts.gitName,
          gitAuthorEmail: opts.gitEmail,
        });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Identity created: ${result.id}`);
          console.log(`  name:      ${result.name}`);
          console.log(`  git name:  ${result.gitAuthorName}`);
          console.log(`  git email: ${result.gitAuthorEmail}`);
          console.log(`  public key:`);
          console.log(`${result.publicKey}`);
        }
      } finally {
        await cleanup();
      }
    });

  identity
    .command('list')
    .description('List all identities')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const identityService = services.get(IdentityService);
        const identities = await identityService.list(userId);

        if (isJson(this)) {
          printJson(identities);
        } else {
          printTable(identities, [
            { header: 'ID', key: 'id' },
            { header: 'Name', key: 'name' },
            { header: 'Git Name', key: 'gitAuthorName' },
            { header: 'Git Email', key: 'gitAuthorEmail' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  identity
    .command('get')
    .description('Get identity details')
    .argument('<id>', 'Identity ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const identityService = services.get(IdentityService);
        const result = await identityService.get({ userId, identityId: id });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`id:         ${result.id}`);
          console.log(`name:       ${result.name}`);
          console.log(`git name:   ${result.gitAuthorName}`);
          console.log(`git email:  ${result.gitAuthorEmail}`);
          console.log(`public key:`);
          console.log(`${result.publicKey}`);
          console.log(`created:    ${result.createdAt}`);
          console.log(`updated:    ${result.updatedAt}`);
        }
      } finally {
        await cleanup();
      }
    });

  identity
    .command('delete')
    .description('Delete an identity')
    .argument('<id>', 'Identity ID')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const identityService = services.get(IdentityService);
        await identityService.delete({ userId, identityId: id });
        console.log(`Identity ${id} deleted.`);
      } finally {
        await cleanup();
      }
    });
};

export { registerIdentityCommands };
