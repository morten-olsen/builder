import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { registerAuthRoutes } from '../auth/auth.js';
import { registerIdentityRoutes } from '../identities/identities.js';
import { registerRepoRoutes } from '../repos/repos.js';
import type { AgentProvider } from '../../services/agent/agent.js';
import { AgentService } from '../../services/agent/agent.js';

import { registerSessionRoutes } from './sessions.js';

const createMockAgentProvider = (): AgentProvider => ({
  name: 'mock',
  run: async ({ onEvent }) => {
    onEvent({
      type: 'message',
      message: {
        role: 'assistant',
        content: 'Done',
        timestamp: new Date().toISOString(),
      },
    });
    onEvent({ type: 'completed', summary: 'Task complete' });
  },
  sendMessage: async () => {},
  stop: async () => {},
  abort: async () => {},
  isRunning: () => false,
});

describe('session routes', () => {
  let services: Services;
  let app: Awaited<ReturnType<typeof createApp>>;
  let token: string;
  let userId: string;
  let identityId: string;
  let repoId: string;

  beforeEach(async () => {
    const config = createTestConfig({
      agent: { provider: 'mock', apiKey: '', model: 'test' },
    });
    services = new Services(config);

    const agentService = services.get(AgentService);
    agentService.registerProvider(createMockAgentProvider());

    app = await createApp({ services, config });
    registerAuthRoutes(app);
    registerIdentityRoutes(app);
    registerRepoRoutes(app);
    registerSessionRoutes(app);
    await app.ready();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const body = registerRes.json();
    token = body.token;
    userId = body.user.id;

    const identityRes = await app.inject({
      method: 'POST',
      url: `/users/${userId}/identities`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Test Identity',
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@test.com',
      },
    });
    identityId = identityRes.json().id;

    const repoRes = await app.inject({
      method: 'POST',
      url: '/repos',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Test Repo',
        repoUrl: 'git@github.com:test/repo.git',
        defaultBranch: 'main',
        defaultIdentityId: identityId,
      },
    });
    repoId = repoRes.json().id;
  });

  afterEach(async () => {
    await app.close();
    await services[destroy]();
  });

  const authHeader = (): Record<string, string> => ({ authorization: `Bearer ${token}` });

  const createSession = async (prompt = 'Fix the bug'): Promise<Record<string, unknown>> => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      headers: authHeader(),
      payload: {
        repoId,
        prompt,
      },
    });
    return res.json();
  };

  describe('POST /sessions', () => {
    it('creates a session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        headers: authHeader(),
        payload: {
          repoId,
          prompt: 'Fix the bug',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeTruthy();
      expect(body.userId).toBe(userId);
      expect(body.status).toBe('pending');
      expect(body.prompt).toBe('Fix the bug');
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        payload: {
          repoId,
          prompt: 'Fix',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for missing fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions',
        headers: authHeader(),
        payload: { repoId },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /sessions', () => {
    it('lists sessions for user', async () => {
      await createSession('Task 1');
      await createSession('Task 2');

      const response = await app.inject({
        method: 'GET',
        url: '/sessions',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });

    it('returns empty array when no sessions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /sessions/:sessionId', () => {
    it('returns a session', async () => {
      const created = await createSession();

      const response = await app.inject({
        method: 'GET',
        url: `/sessions/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().prompt).toBe('Fix the bug');
    });

    it('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions/non-existent',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions/some-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /sessions/:sessionId', () => {
    it('deletes a session', async () => {
      const created = await createSession();

      const response = await app.inject({
        method: 'DELETE',
        url: `/sessions/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(204);

      const getRes = await app.inject({
        method: 'GET',
        url: `/sessions/${created.id}`,
        headers: authHeader(),
      });
      expect(getRes.statusCode).toBe(404);
    });

    it('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/sessions/non-existent',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/sessions/some-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /sessions/:sessionId/messages', () => {
    it('sends a message to a session', async () => {
      const created = await createSession();

      const response = await app.inject({
        method: 'POST',
        url: `/sessions/${created.id}/messages`,
        headers: authHeader(),
        payload: { message: 'Try a different approach' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions/non-existent/messages',
        headers: authHeader(),
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions/some-id/messages',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /sessions/:sessionId/stop', () => {
    it('stops an idle session', async () => {
      const created = await createSession();

      const response = await app.inject({
        method: 'POST',
        url: `/sessions/${created.id}/stop`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions/non-existent/stop',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sessions/some-id/stop',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /sessions/:sessionId/events', () => {
    it('returns 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions/non-existent/events',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/sessions/some-id/events',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
