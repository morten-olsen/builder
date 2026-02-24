import path from 'node:path';

import type { Services } from '../../container/container.js';
import type { AgentEvent } from '../agent/agent.js';
import { AgentService } from '../agent/agent.js';
import { DatabaseService } from '../database/database.js';
import { GitService } from '../git/git.js';
import { IdentityService } from '../identity/identity.js';
import { MessageService } from '../message/message.js';
import { SessionEventService } from '../session-event/session-event.js';
import { EventBusService } from '../../sse/event-bus.js';

import { SessionService } from './session.js';

const mapAgentEvent = (sessionId: string, event: AgentEvent, eventBus: EventBusService): void => {
  switch (event.type) {
    case 'message':
      eventBus.emit(sessionId, {
        type: 'agent:output',
        data: { text: event.message.content, messageType: event.message.role },
      });
      break;
    case 'tool_use':
      eventBus.emit(sessionId, {
        type: 'agent:tool_use',
        data: { tool: event.tool, input: event.input },
      });
      break;
    case 'tool_result':
      eventBus.emit(sessionId, {
        type: 'agent:tool_result',
        data: { tool: event.tool, output: event.output },
      });
      break;
    case 'waiting_for_input':
      eventBus.emit(sessionId, {
        type: 'session:waiting_for_input',
        data: { prompt: event.prompt },
      });
      break;
    case 'completed':
      eventBus.emit(sessionId, {
        type: 'session:completed',
        data: { summary: event.summary },
      });
      break;
    case 'error':
      eventBus.emit(sessionId, {
        type: 'session:error',
        data: { error: event.error },
      });
      break;
  }
};

const worktreePath = (services: Services, sessionId: string): string =>
  path.join(services.config.session.dataDir, 'worktrees', sessionId);

const snapshotWorktree = async (services: Services, sessionId: string): Promise<string | null> => {
  try {
    const sessionService = services.get(SessionService);
    const identityService = services.get(IdentityService);
    const gitService = services.get(GitService);

    const session = await sessionService.getById(sessionId);
    const identity = await identityService.get({
      userId: session.userId,
      identityId: session.identityId,
    });

    const cwd = worktreePath(services, sessionId);
    const hasChanges = await gitService.hasUncommittedChanges({ worktreePath: cwd });

    if (hasChanges) {
      const sha = await gitService.commit({
        worktreePath: cwd,
        message: '[snapshot] pre-agent',
        authorName: identity.gitAuthorName,
        authorEmail: identity.gitAuthorEmail,
      });
      return sha;
    }

    return gitService.getHead({ worktreePath: cwd });
  } catch {
    return null;
  }
};

const runAgentLoop = async (
  services: Services,
  sessionId: string,
  prompt: string,
  cwd: string,
  resume?: boolean,
): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);
  const messageService = services.get(MessageService);

  const provider = agentService.getProvider();

  await provider.run({
    sessionId,
    prompt,
    cwd,
    resume,
    onEvent: async (event) => {
      mapAgentEvent(sessionId, event, eventBus);

      if (event.type === 'completed') {
        await sessionService.updateStatus({ sessionId, status: 'idle' });
        eventBus.emit(sessionId, {
          type: 'session:status',
          data: { status: 'idle' },
        });
        await messageService.create({
          sessionId,
          role: 'assistant',
          content: event.summary,
        });
      } else if (event.type === 'error') {
        await sessionService.updateStatus({ sessionId, status: 'failed', error: event.error });
      } else if (event.type === 'waiting_for_input') {
        await sessionService.updateStatus({ sessionId, status: 'waiting_for_input' });
      }
    },
  });

  // provider.run() resolves after all onEvent callbacks have been awaited.
  // If the agent completed normally, status is already 'idle'. If it was
  // stopped/aborted externally, the caller already set the appropriate status.
  // Only mark completed as a fallback if status is still 'running' (e.g. the
  // stream ended without an explicit result message).
  const current = await sessionService.getById(sessionId);
  if (current.status === 'running') {
    await sessionService.updateStatus({ sessionId, status: 'completed' });
    eventBus.emit(sessionId, {
      type: 'session:status',
      data: { status: 'completed' },
    });
  }
};

const startSession = async (services: Services, sessionId: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const identityService = services.get(IdentityService);
  const gitService = services.get(GitService);
  const eventBus = services.get(EventBusService);
  const messageService = services.get(MessageService);

  try {
    const session = await sessionService.getById(sessionId);
    eventBus.registerSession(sessionId, session.userId);

    eventBus.emit(sessionId, {
      type: 'session:status',
      data: { status: 'cloning' },
    });

    const sshPrivateKey = await identityService.getPrivateKey({
      userId: session.userId,
      identityId: session.identityId,
    });

    const bareRepoPath = await gitService.ensureBareClone({
      repoUrl: session.repoUrl,
      identityId: session.identityId,
      sshPrivateKey,
    });

    await gitService.fetch({ bareRepoPath, sshPrivateKey });

    const cwd = await gitService.createWorktree({
      bareRepoPath,
      sessionId,
      ref: session.branch,
    });

    await sessionService.updateStatus({ sessionId, status: 'running' });
    eventBus.emit(sessionId, {
      type: 'session:status',
      data: { status: 'running' },
    });

    const commitSha = await snapshotWorktree(services, sessionId);
    const userMessage = await messageService.create({
      sessionId,
      role: 'user',
      content: session.prompt,
      commitSha: commitSha ?? undefined,
    });
    if (commitSha) {
      eventBus.emit(sessionId, {
        type: 'session:snapshot',
        data: { messageId: userMessage.id, commitSha },
      });
    }

    await runAgentLoop(services, sessionId, session.prompt, cwd);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sessionService.updateStatus({ sessionId, status: 'failed', error: errorMessage });
    eventBus.emit(sessionId, {
      type: 'session:error',
      data: { error: errorMessage },
    });
  }
};

const sendSessionMessage = async (services: Services, sessionId: string, message: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const messageService = services.get(MessageService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const session = await sessionService.getById(sessionId);
  eventBus.registerSession(sessionId, session.userId);

  const commitSha = await snapshotWorktree(services, sessionId);
  const userMessage = await messageService.create({ sessionId, role: 'user', content: message, commitSha: commitSha ?? undefined });
  if (commitSha) {
    eventBus.emit(sessionId, {
      type: 'session:snapshot',
      data: { messageId: userMessage.id, commitSha },
    });
  }

  await sessionService.updateStatus({ sessionId, status: 'running' });
  eventBus.emit(sessionId, {
    type: 'session:status',
    data: { status: 'running' },
  });

  const provider = agentService.getProvider();

  if (provider.isRunning(sessionId)) {
    await provider.sendMessage({ sessionId, message });
  } else {
    // Agent was interrupted or died — restart with the new message
    const cwd = worktreePath(services, sessionId);
    runAgentLoop(services, sessionId, message, cwd, true).catch(() => undefined);
  }
};

const interruptSession = async (services: Services, sessionId: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const provider = agentService.getProvider();
  await provider.abort(sessionId);

  await sessionService.updateStatus({ sessionId, status: 'idle' });
  eventBus.emit(sessionId, {
    type: 'session:status',
    data: { status: 'idle' },
  });
};

const stopSession = async (services: Services, sessionId: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const provider = agentService.getProvider();
  await provider.stop(sessionId);

  await sessionService.updateStatus({ sessionId, status: 'completed' });
  eventBus.emit(sessionId, {
    type: 'session:status',
    data: { status: 'completed' },
  });
};

const revertSession = async (services: Services, sessionId: string, messageId: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const messageService = services.get(MessageService);
  const agentService = services.get(AgentService);
  const gitService = services.get(GitService);
  const sessionEventService = services.get(SessionEventService);
  const eventBus = services.get(EventBusService);

  const message = await messageService.getById(messageId);
  if (!message.commitSha) {
    throw new Error('Message has no snapshot to revert to');
  }

  // Abort the agent if running
  const provider = agentService.getProvider();
  try {
    await provider.abort(sessionId);
  } catch {
    // Agent may not be running
  }

  // Reset the worktree to the snapshot commit
  const cwd = worktreePath(services, sessionId);
  await gitService.resetHard({ worktreePath: cwd, ref: message.commitSha });

  // Find the max event sequence at or before the target message's creation time
  const db = await services.get(DatabaseService).getInstance();
  const row = await db
    .selectFrom('session_events')
    .select(db.fn.max('sequence').as('max_seq'))
    .where('session_id', '=', sessionId)
    .where('created_at', '<=', message.createdAt)
    .executeTakeFirst();
  const afterSequence = (row?.max_seq as number | null) ?? 0;

  await sessionEventService.deleteAfterSequence({ sessionId, afterSequence });
  await messageService.deleteAfter({ sessionId, messageId });

  await sessionService.updateStatus({ sessionId, status: 'idle' });
  eventBus.emit(sessionId, {
    type: 'session:status',
    data: { status: 'idle' },
  });
};

export { startSession, sendSessionMessage, interruptSession, stopSession, revertSession };
