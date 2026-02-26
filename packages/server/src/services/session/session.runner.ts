import os from 'node:os';
import path from 'node:path';

import type { Services } from '../../container/container.js';
import type { AgentEvent } from '../agent/agent.js';
import { AgentService } from '../agent/agent.js';
import { AuthService } from '../auth/auth.js';
import { DatabaseService } from '../database/database.js';
import { GitService } from '../git/git.js';
import { IdentityService } from '../identity/identity.js';
import { MessageService } from '../message/message.js';
import { SessionEventService } from '../session-event/session-event.js';
import { EventBusService } from '../../sse/event-bus.js';

import type { SessionRef } from './session.js';
import { sessionKey, SessionService } from './session.js';

const resolveWorktreePath = async (services: Services, ref: SessionRef, identityId: string): Promise<string> => {
  const authService = services.get(AuthService);
  const worktreeBase = await authService.getWorktreeBase(ref.userId);

  if (worktreeBase) {
    return path.join(worktreeBase, identityId, ref.repoId, ref.sessionId);
  }

  return path.join(
    os.homedir(),
    '.builder',
    'users',
    ref.userId,
    'sessions',
    identityId,
    ref.repoId,
    ref.sessionId,
  );
};

const worktreePath = async (services: Services, ref: SessionRef): Promise<string> => {
  const session = await services.get(SessionService).getByRef(ref);
  return resolveWorktreePath(services, ref, session.identityId);
};

const mapAgentEvent = (ref: SessionRef, event: AgentEvent, eventBus: EventBusService): void => {
  switch (event.type) {
    case 'message':
      eventBus.emit(ref, {
        type: 'agent:output',
        data: { text: event.message.content, messageType: event.message.role },
      });
      break;
    case 'tool_use':
      eventBus.emit(ref, {
        type: 'agent:tool_use',
        data: { tool: event.tool, input: event.input },
      });
      break;
    case 'tool_result':
      eventBus.emit(ref, {
        type: 'agent:tool_result',
        data: { tool: event.tool, output: event.output },
      });
      break;
    case 'waiting_for_input':
      eventBus.emit(ref, {
        type: 'session:waiting_for_input',
        data: { prompt: event.prompt },
      });
      break;
    case 'completed':
      eventBus.emit(ref, {
        type: 'session:completed',
        data: { summary: event.summary },
      });
      break;
    case 'error':
      eventBus.emit(ref, {
        type: 'session:error',
        data: { error: event.error },
      });
      break;
  }
};

const snapshotWorktree = async (services: Services, ref: SessionRef): Promise<string | null> => {
  try {
    const sessionService = services.get(SessionService);
    const identityService = services.get(IdentityService);
    const gitService = services.get(GitService);

    const session = await sessionService.getByRef(ref);
    const identity = await identityService.get({
      userId: session.userId,
      identityId: session.identityId,
    });

    const cwd = await worktreePath(services, ref);
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
  ref: SessionRef,
  prompt: string,
  cwd: string,
  resume?: boolean,
  model?: string,
): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);
  const messageService = services.get(MessageService);

  const key = sessionKey(ref);
  const provider = agentService.getProvider();

  await provider.run({
    sessionId: key,
    prompt,
    cwd,
    resume,
    model,
    onEvent: async (event) => {
      mapAgentEvent(ref, event, eventBus);

      if (event.type === 'completed') {
        await sessionService.updateStatus({ ref, status: 'idle' });
        eventBus.emit(ref, {
          type: 'session:status',
          data: { status: 'idle' },
        });
        await messageService.create({
          ref,
          role: 'assistant',
          content: event.summary,
        });
      } else if (event.type === 'error') {
        await sessionService.updateStatus({ ref, status: 'failed', error: event.error });
      } else if (event.type === 'waiting_for_input') {
        await sessionService.updateStatus({ ref, status: 'waiting_for_input' });
      }
    },
  });

  const current = await sessionService.getByRef(ref);
  if (current.status === 'running') {
    await sessionService.updateStatus({ ref, status: 'completed' });
    eventBus.emit(ref, {
      type: 'session:status',
      data: { status: 'completed' },
    });
  }
};

const startSession = async (services: Services, ref: SessionRef): Promise<void> => {
  const sessionService = services.get(SessionService);
  const identityService = services.get(IdentityService);
  const gitService = services.get(GitService);
  const eventBus = services.get(EventBusService);
  const messageService = services.get(MessageService);

  try {
    const session = await sessionService.getByRef(ref);
    eventBus.registerSession(ref);

    eventBus.emit(ref, {
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

    const key = sessionKey(ref);
    const wtPath = await resolveWorktreePath(services, ref, session.identityId);
    const cwd = await gitService.createWorktree({
      bareRepoPath,
      worktreePath: wtPath,
      branchName: `session/${key.replace(/\//g, '-')}`,
      ref: session.branch,
    });

    await sessionService.updateStatus({ ref, status: 'running' });
    eventBus.emit(ref, {
      type: 'session:status',
      data: { status: 'running' },
    });

    const commitSha = await snapshotWorktree(services, ref);
    const userMessage = await messageService.create({
      ref,
      role: 'user',
      content: session.prompt,
      commitSha: commitSha ?? undefined,
    });
    eventBus.emit(ref, {
      type: 'user:message',
      data: { message: session.prompt },
    });
    if (commitSha) {
      eventBus.emit(ref, {
        type: 'session:snapshot',
        data: { messageId: userMessage.id, commitSha },
      });
    }

    await runAgentLoop(services, ref, session.prompt, cwd, undefined, session.model ?? undefined);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sessionService.updateStatus({ ref, status: 'failed', error: errorMessage });
    eventBus.emit(ref, {
      type: 'session:error',
      data: { error: errorMessage },
    });
  }
};

const sendSessionMessage = async (services: Services, ref: SessionRef, message: string): Promise<void> => {
  const sessionService = services.get(SessionService);
  const messageService = services.get(MessageService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const session = await sessionService.getByRef(ref);
  eventBus.registerSession(ref);

  const commitSha = await snapshotWorktree(services, ref);
  const userMessage = await messageService.create({ ref, role: 'user', content: message, commitSha: commitSha ?? undefined });
  eventBus.emit(ref, {
    type: 'user:message',
    data: { message },
  });
  if (commitSha) {
    eventBus.emit(ref, {
      type: 'session:snapshot',
      data: { messageId: userMessage.id, commitSha },
    });
  }

  await sessionService.updateStatus({ ref, status: 'running' });
  eventBus.emit(ref, {
    type: 'session:status',
    data: { status: 'running' },
  });

  const key = sessionKey(ref);
  const provider = agentService.getProvider();

  if (provider.isRunning(key)) {
    await provider.sendMessage({ sessionId: key, message });
  } else {
    const cwd = await worktreePath(services, ref);

    if (session.status === 'reverted') {
      const history = await messageService.listBySession(ref);
      const contextLines = history.map(
        (m) => `[${m.role}]: ${m.content}`,
      );
      const prompt = contextLines.length > 0
        ? `Here is the conversation history from previous turns:\n\n${contextLines.join('\n\n')}\n\n---\n\nNew message from user:\n${message}`
        : message;
      runAgentLoop(services, ref, prompt, cwd, false, session.model ?? undefined).catch(() => undefined);
    } else {
      runAgentLoop(services, ref, message, cwd, true, session.model ?? undefined).catch(() => undefined);
    }
  }
};

const interruptSession = async (services: Services, ref: SessionRef): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const key = sessionKey(ref);
  const provider = agentService.getProvider();
  await provider.abort(key);

  await sessionService.updateStatus({ ref, status: 'idle' });
  eventBus.emit(ref, {
    type: 'session:status',
    data: { status: 'idle' },
  });
};

const stopSession = async (services: Services, ref: SessionRef): Promise<void> => {
  const sessionService = services.get(SessionService);
  const agentService = services.get(AgentService);
  const eventBus = services.get(EventBusService);

  const key = sessionKey(ref);
  const provider = agentService.getProvider();
  await provider.stop(key);

  await sessionService.updateStatus({ ref, status: 'completed' });
  eventBus.emit(ref, {
    type: 'session:status',
    data: { status: 'completed' },
  });
};

const revertSession = async (services: Services, ref: SessionRef, messageId: string): Promise<void> => {
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
  const key = sessionKey(ref);
  const provider = agentService.getProvider();
  try {
    await provider.abort(key);
  } catch {
    // Agent may not be running
  }

  // Reset the worktree to the snapshot commit
  const cwd = await worktreePath(services, ref);
  await gitService.resetHard({ worktreePath: cwd, ref: message.commitSha });

  const db = await services.get(DatabaseService).getInstance();
  const snapshotRow = await db
    .selectFrom('session_events')
    .select('sequence')
    .where('session_id', '=', ref.sessionId)
    .where('repo_id', '=', ref.repoId)
    .where('user_id', '=', ref.userId)
    .where('type', '=', 'session:snapshot')
    .where('data', 'like', `%${messageId}%`)
    .executeTakeFirst();

  if (snapshotRow) {
    const userMsgRow = await db
      .selectFrom('session_events')
      .select('sequence')
      .where('session_id', '=', ref.sessionId)
      .where('repo_id', '=', ref.repoId)
      .where('user_id', '=', ref.userId)
      .where('type', '=', 'user:message')
      .where('sequence', '<=', snapshotRow.sequence)
      .orderBy('sequence', 'desc')
      .limit(1)
      .executeTakeFirst();

    const firstEventOfNextTurn = userMsgRow?.sequence ?? snapshotRow.sequence;
    await sessionEventService.deleteAfterSequence({
      ref,
      afterSequence: firstEventOfNextTurn - 1,
    });
  }

  // Delete the target message and everything after it
  await messageService.deleteAfter({ ref, messageId });
  await db
    .deleteFrom('messages')
    .where('id', '=', messageId)
    .where('session_id', '=', ref.sessionId)
    .where('repo_id', '=', ref.repoId)
    .where('user_id', '=', ref.userId)
    .execute();

  await sessionService.updateStatus({ ref, status: 'reverted' });
  eventBus.emit(ref, {
    type: 'session:status',
    data: { status: 'reverted' },
  });
};

export { startSession, sendSessionMessage, interruptSession, stopSession, revertSession };
