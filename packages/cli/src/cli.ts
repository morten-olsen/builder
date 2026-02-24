#!/usr/bin/env node

// Must be first import — sets env defaults before server module's convict schema reads them.
import './cli.defaults.js';

import { Command } from 'commander';

import { registerAdminCommands } from './commands/commands.admin.js';
import { registerAuthCommands } from './commands/commands.auth.js';
import { registerIdentityCommands } from './commands/commands.identity.js';
import { registerRepoCommands } from './commands/commands.repo.js';
import { registerServerCommands } from './commands/commands.server.js';
import { registerSessionCommands } from './commands/commands.session.js';
import { printError } from './cli.output.js';

const program = new Command();

program
  .name('builder')
  .description('CLI for the coding agent orchestrator')
  .version('1.0.0');

registerServerCommands(program);
registerAuthCommands(program);
registerIdentityCommands(program);
registerRepoCommands(program);
registerSessionCommands(program);
registerAdminCommands(program);

program.parseAsync().catch((error: unknown) => {
  printError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
