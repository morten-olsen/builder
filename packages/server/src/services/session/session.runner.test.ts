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
import type { AgentProvider } from '../agent/agent.js';
import { AgentService } from '../agent/agent.js';
import type { SessionEvent } from '../../sse/event-bus.js';
import { EventBusService } from '../../sse/event-bus.js';

import { SessionService } from './session.js';
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

    // Bootstrap user + identity
    const app = await createApp({ services, config });
    registerAuthRoutes(app);
    registerIdentityRoutes(app);
    await app.ready();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const authBody = registerRes.json();
    userId = authBody.user.id;

    const identityRes = await app.inject({
      method: 'POST',
      url: `/users/${userId}/identities`,
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: {
        name: 'Test Identity',
        gitAuthorName: 'Test',
        gitAuthorEmail: 'test@test.com',
      },
    });
    identityId = identityRes.json().id;

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
      userId,
      identityId,
      repoUrl: `file://${originRepoPath}`,
      branch: 'main',
      prompt: 'Fix the bug',
    });

    const events: SessionEvent[] = [];
    eventBus.subscribe(session.id, (event) => events.push(event));

    await startSession(services, session.id);

    const updated = await sessionService.getById(session.id);
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
      userId,
      identityId,
      repoUrl: `file://${originRepoPath}`,
      branch: 'main',
      prompt: 'Break things',
    });

    await startSession(services, session.id);

    const updated = await sessionService.getById(session.id);
    expect(updated.status).toBe('failed');
    expect(updated.error).toBe('Something broke');
  });
});
