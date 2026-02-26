import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { simpleGit } from 'simple-git';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { registerAuthRoutes } from '../../routes/auth/auth.js';
import { registerIdentityRoutes } from '../../routes/identities/identities.js';
import { registerRepoRoutes } from '../../routes/repos/repos.js';
import type { AgentProvider } from '../agent/agent.js';
import { AgentService } from '../agent/agent.js';
import type { SessionEvent } from '../../sse/event-bus.js';
import { EventBusService } from '../../sse/event-bus.js';

import type { SessionRef } from './session.js';
import { sessionRef, SessionService } from './session.js';
import { startSession } from './session.runner.js';

const createMockAgentProvider = (): AgentProvider => ({
  name: 'mock',
  run: async ({ onEvent }) => {
    await onEvent({
      type: 'message',
      message: {
        role: 'assistant',
        content: 'Working on it',
        timestamp: new Date().toISOString(),
      },
    });
    await onEvent({ type: 'completed', summary: 'Done' });
  },
  sendMessage: async () => {},
  stop: async () => {},
  abort: async () => {},
  isRunning: () => false,
});

describe('startSession', () => {
  let services: Services;
  let tmpDir: string;
  let userId: string;
  let identityId: string;
  let repoId: string;
  let originRepoPath: string;

  beforeEach(async () => {
    process.env.GIT_CONFIG_NOSYSTEM = '1';
    process.env.GIT_CONFIG_GLOBAL = '/dev/null';
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'runner-test-'));

    // Create origin repo
    originRepoPath = path.join(tmpDir, 'origin');
    await mkdir(originRepoPath, { recursive: true });
    const originGit = simpleGit(originRepoPath)
      .env('GIT_CONFIG_NOSYSTEM', '1')
      .env('GIT_CONFIG_GLOBAL', '/dev/null');
    await originGit.raw(['init', '-b', 'main']);
    await originGit.addConfig('user.email', 'test@test.com');
    await originGit.addConfig('user.name', 'Test');
    await originGit.addConfig('commit.gpgsign', 'false');
    await writeFile(path.join(originRepoPath, 'README.md'), '# Test');
    await originGit.add('.');
    await originGit.commit('initial commit');

    const config = createTestConfig({
      session: { dataDir: tmpDir },
      agent: { provider: 'mock', apiKey: '', model: 'test' },
    });
    services = new Services(config);

    // Register mock agent provider
    const agentService = services.get(AgentService);
    agentService.registerProvider(createMockAgentProvider());

    // Bootstrap user + identity + repo via API
    const app = await createApp({ services, config });
    registerAuthRoutes(app);
    registerIdentityRoutes(app);
    registerRepoRoutes(app);
    await app.ready();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { id: 'test-user', password: 'password123' },
    });
    const authBody = registerRes.json();
    userId = authBody.user.id;
    const token = authBody.token;

    const identityRes = await app.inject({
      method: 'POST',
      url: `/api/users/${userId}/identities`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: 'test-identity',
        name: 'Test Identity',
        gitAuthorName: 'Test',
        gitAuthorEmail: 'test@test.com',
      },
    });
    identityId = identityRes.json().id;

    const repoRes = await app.inject({
      method: 'POST',
      url: '/api/repos',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: 'test-repo',
        name: 'Test Repo',
        repoUrl: `file://${originRepoPath}`,
        defaultBranch: 'main',
        defaultIdentityId: identityId,
      },
    });
    repoId = repoRes.json().id;

    await app.close();
  });

  afterEach(async () => {
    delete process.env.GIT_CONFIG_NOSYSTEM;
    delete process.env.GIT_CONFIG_GLOBAL;
    await services[destroy]();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('runs through the full session lifecycle', async () => {
    const sessionService = services.get(SessionService);
    const eventBus = services.get(EventBusService);

    const session = await sessionService.create({
      id: 'fix-bug',
      userId,
      repoId,
      identityId,
      repoUrl: `file://${originRepoPath}`,
      branch: 'main',
      prompt: 'Fix the bug',
    });

    const ref: SessionRef = sessionRef(session);
    const events: SessionEvent[] = [];
    eventBus.subscribe(ref, (event) => events.push(event));

    await startSession(services, ref);

    const updated = await sessionService.getByRef(ref);
    expect(updated.status).toBe('idle');

    const statusEvents = events.filter((e) => e.type === 'session:status');
    expect(statusEvents.length).toBeGreaterThan(0);

    const completedEvents = events.filter((e) => e.type === 'session:completed');
    expect(completedEvents).toHaveLength(1);

    const idleStatuses = statusEvents.filter(
      (e) => e.type === 'session:status' && (e.data as { status: string }).status === 'idle',
    );
    expect(idleStatuses.length).toBeGreaterThan(0);
  });

  it('sets status to failed on error', async () => {
    const agentService = services.get(AgentService);
    agentService.registerProvider({
      name: 'mock',
      run: async ({ onEvent }) => {
        await onEvent({ type: 'error', error: 'Something broke' });
      },
      sendMessage: async () => {},
      stop: async () => {},
      abort: async () => {},
      isRunning: () => false,
    });

    const sessionService = services.get(SessionService);
    const session = await sessionService.create({
      id: 'break-things',
      userId,
      repoId,
      identityId,
      repoUrl: `file://${originRepoPath}`,
      branch: 'main',
      prompt: 'Break things',
    });

    const ref: SessionRef = sessionRef(session);
    await startSession(services, ref);

    const updated = await sessionService.getByRef(ref);
    expect(updated.status).toBe('failed');
    expect(updated.error).toBe('Something broke');
  });
});
