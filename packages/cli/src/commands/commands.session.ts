import type { Command } from 'commander';
import type { SessionEvent } from '@morten-olsen/builder-server';
import {
  AgentService,
  EventBusService,
  RepoService,
  SessionService,
  startSession,
} from '@morten-olsen/builder-server';

import { loadAuth, requireAuth } from '../cli.auth-store.js';
import { createCliContext } from '../cli.context.js';
import { createHttpClient } from '../cli.http.js';
import { isJson, printJson, printTable } from '../cli.output.js';

const renderEvent = (event: SessionEvent): void => {
  switch (event.type) {
    case 'session:status':
      console.log(`[status] ${event.data.status}`);
      break;
    case 'agent:output':
      process.stdout.write(event.data.text);
      break;
    case 'agent:tool_use':
      console.log(`[tool] ${event.data.tool} ${JSON.stringify(event.data.input)}`);
      break;
    case 'agent:tool_result':
      console.log(`[tool:result] ${event.data.tool}`);
      break;
    case 'session:completed':
      console.log(`\n[completed] ${event.data.summary}`);
      break;
    case 'session:error':
      console.error(`\n[error] ${event.data.error}`);
      break;
    case 'session:waiting_for_input':
      console.log(`\n[waiting_for_input] ${event.data.prompt}`);
      break;
  }
};

const registerSessionCommands = (program: Command): void => {
  const session = program.command('session').description('Session management commands');

  session
    .command('create')
    .description('Create a new session')
    .requiredOption('--repo <id>', 'Repo ID')
    .option('--identity <id>', 'Identity ID (overrides repo default)')
    .option('--branch <branch>', 'Base branch to branch from (overrides repo default)')
    .option('--session-branch <branch>', 'Custom name for the new session branch')
    .requiredOption('--prompt <prompt>', 'Prompt for the agent')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const opts = this.opts<{ repo: string; identity?: string; branch?: string; sessionBranch?: string; prompt: string }>();
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const repo = await repoService.get({ userId, repoId: opts.repo });

        const identityId = opts.identity ?? repo.defaultIdentityId;
        if (!identityId) {
          throw new Error('No identity specified and repo has no default identity');
        }

        const branch = opts.branch ?? repo.defaultBranch;
        if (!branch) {
          throw new Error('No branch specified and repo has no default branch');
        }

        const sessionService = services.get(SessionService);
        const result = await sessionService.create({
          userId,
          identityId,
          repoUrl: repo.repoUrl,
          branch,
          sessionBranch: opts.sessionBranch,
          prompt: opts.prompt,
          repoId: repo.id,
        });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`Session created: ${result.id}`);
          console.log(`  status: ${result.status}`);
          console.log(`  repo:   ${result.repoUrl}`);
          console.log(`  branch: ${result.branch}`);
        }
      } finally {
        await cleanup();
      }
    });

  session
    .command('list')
    .description('List all sessions')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const sessionService = services.get(SessionService);
        const sessions = await sessionService.list(userId);

        if (isJson(this)) {
          printJson(sessions);
        } else {
          printTable(sessions, [
            { header: 'ID', key: 'id' },
            { header: 'Status', key: 'status' },
            { header: 'Repo', key: 'repoUrl' },
            { header: 'Branch', key: 'branch' },
            { header: 'Created', key: 'createdAt' },
          ]);
        }
      } finally {
        await cleanup();
      }
    });

  session
    .command('get')
    .description('Get session details')
    .argument('<id>', 'Session ID')
    .option('--json', 'Output as JSON')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const sessionService = services.get(SessionService);
        const result = await sessionService.get({ userId, sessionId: id });

        if (isJson(this)) {
          printJson(result);
        } else {
          console.log(`id:       ${result.id}`);
          console.log(`status:   ${result.status}`);
          console.log(`repo:     ${result.repoUrl}`);
          console.log(`branch:   ${result.branch}`);
          console.log(`prompt:   ${result.prompt}`);
          console.log(`error:    ${result.error ?? 'none'}`);
          console.log(`created:  ${result.createdAt}`);
          console.log(`updated:  ${result.updatedAt}`);
        }
      } finally {
        await cleanup();
      }
    });

  session
    .command('delete')
    .description('Delete a session')
    .argument('<id>', 'Session ID')
    .action(async function (this: Command, id: string) {
      const { services, cleanup } = await createCliContext();
      try {
        const { userId } = await requireAuth(services);
        const agentService = services.get(AgentService);
        const provider = agentService.getProvider();
        await provider.abort(id);

        const sessionService = services.get(SessionService);
        await sessionService.delete({ userId, sessionId: id });

        const eventBus = services.get(EventBusService);
        eventBus.remove(id);

        console.log(`Session ${id} deleted.`);
      } finally {
        await cleanup();
      }
    });

  session
    .command('run')
    .description('Create a session and run the agent to completion')
    .requiredOption('--repo <id>', 'Repo ID')
    .option('--identity <id>', 'Identity ID (overrides repo default)')
    .option('--branch <branch>', 'Base branch to branch from (overrides repo default)')
    .option('--session-branch <branch>', 'Custom name for the new session branch')
    .requiredOption('--prompt <prompt>', 'Prompt for the agent')
    .option('--json', 'Output as newline-delimited JSON events')
    .action(async function (this: Command) {
      const opts = this.opts<{ repo: string; identity?: string; branch?: string; sessionBranch?: string; prompt: string }>();
      const json = isJson(this);
      const { services, cleanup } = await createCliContext();
      let exitCode = 0;
      let sessionId: string | null = null;

      try {
        const { userId } = await requireAuth(services);
        const repoService = services.get(RepoService);
        const repo = await repoService.get({ userId, repoId: opts.repo });

        const identityId = opts.identity ?? repo.defaultIdentityId;
        if (!identityId) {
          throw new Error('No identity specified and repo has no default identity');
        }

        const branch = opts.branch ?? repo.defaultBranch;
        if (!branch) {
          throw new Error('No branch specified and repo has no default branch');
        }

        const sessionService = services.get(SessionService);
        const eventBus = services.get(EventBusService);

        const result = await sessionService.create({
          userId,
          identityId,
          repoUrl: repo.repoUrl,
          branch,
          sessionBranch: opts.sessionBranch,
          prompt: opts.prompt,
          repoId: repo.id,
        });

        sessionId = result.id;

        if (!json) {
          console.log(`Session ${result.id} created. Starting agent...`);
        }

        let firstTurnDone = false;

        const unsubscribe = eventBus.subscribe(result.id, (event: SessionEvent) => {
          if (json) {
            console.log(JSON.stringify(event));
          } else {
            renderEvent(event);
          }

          if (event.type === 'session:error') {
            exitCode = 1;
          }

          if (event.type === 'session:status' && event.data.status === 'idle') {
            firstTurnDone = true;
          }
        });

        const handleSignal = async (): Promise<void> => {
          if (!json) {
            console.log('\nAborting...');
          }
          const provider = services.get(AgentService).getProvider();
          await provider.abort(result.id);
          unsubscribe();
          await cleanup();
          process.exit(130);
        };

        process.on('SIGINT', () => void handleSignal());
        process.on('SIGTERM', () => void handleSignal());

        await startSession(services, result.id);

        unsubscribe();

        if (firstTurnDone && !json && sessionId) {
          console.log(`\nSession idle: ${sessionId}. Send follow-up messages with: builder session send ${sessionId} --message '...'`);
        }
      } finally {
        await cleanup();
      }

      process.exit(exitCode);
    });

  session
    .command('send')
    .description('Send a follow-up message to an idle session')
    .argument('<id>', 'Session ID')
    .requiredOption('--message <message>', 'Message to send')
    .option('--json', 'Output as newline-delimited JSON events')
    .action(async function (this: Command, id: string) {
      const opts = this.opts<{ message: string }>();
      const json = isJson(this);
      const auth = loadAuth();
      if (!auth) {
        throw new Error('Not logged in. Run `builder auth login` or `builder auth register` first.');
      }

      const baseUrl = process.env.BUILDER_SERVER_URL ?? 'http://localhost:4120';
      const client = createHttpClient(baseUrl, auth.token);

      let exitCode = 0;

      // Start SSE stream first, then send the message.
      // streamSSE resolves when the `until` predicate returns true.
      const streamDone = client.streamSSE(
        `/api/sessions/${id}/events`,
        (event) => {
          if (json) {
            console.log(JSON.stringify(event));
          } else {
            renderEvent(event);
          }
          if (event.type === 'session:error') {
            exitCode = 1;
          }
        },
        (event) =>
          (event.type === 'session:status' && event.data.status === 'idle') ||
          (event.type === 'session:status' && event.data.status === 'completed') ||
          (event.type === 'session:status' && event.data.status === 'failed') ||
          event.type === 'session:error',
      );

      await client.post(`/api/sessions/${id}/messages`, { message: opts.message });

      await streamDone;

      if (!json) {
        console.log(`\nSession idle: ${id}. Send follow-up messages with: builder session send ${id} --message '...'`);
      }

      process.exit(exitCode);
    });

  session
    .command('stop')
    .description('Gracefully stop an idle session')
    .argument('<id>', 'Session ID')
    .action(async function (this: Command, id: string) {
      const auth = loadAuth();
      if (!auth) {
        throw new Error('Not logged in. Run `builder auth login` or `builder auth register` first.');
      }

      const baseUrl = process.env.BUILDER_SERVER_URL ?? 'http://localhost:4120';
      const client = createHttpClient(baseUrl, auth.token);

      await client.post(`/api/sessions/${id}/stop`, {});
      console.log(`Session ${id} stopped.`);
    });
};

export { registerSessionCommands };
