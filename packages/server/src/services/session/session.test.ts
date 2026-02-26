import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { registerAuthRoutes } from '../../routes/auth/auth.js';
import { registerIdentityRoutes } from '../../routes/identities/identities.js';
import { registerRepoRoutes } from '../../routes/repos/repos.js';

import { SessionNotFoundError } from './session.errors.js';
import type { SessionRef } from './session.js';
import { sessionRef, SessionService } from './session.js';

describe('SessionService', () => {
  let services: Services;
  let sessionService: SessionService;
  let userId: string;
  let identityId: string;
  let repoId: string;
  let repoUrl: string;

  beforeEach(async () => {
    const config = createTestConfig();
    services = new Services(config);

    // Bootstrap a user + identity + repo so FK constraints pass
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

    const identityRes = await app.inject({
      method: 'POST',
      url: `/api/users/${userId}/identities`,
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: {
        id: 'test-identity',
        name: 'Test Identity',
        gitAuthorName: 'Test',
        gitAuthorEmail: 'test@test.com',
      },
    });
    identityId = identityRes.json().id;

    repoUrl = 'git@github.com:test/repo.git';
    const repoRes = await app.inject({
      method: 'POST',
      url: '/api/repos',
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: {
        id: 'test-repo',
        name: 'Test Repo',
        repoUrl,
        defaultBranch: 'main',
        defaultIdentityId: identityId,
      },
    });
    repoId = repoRes.json().id;

    await app.close();

    sessionService = services.get(SessionService);
  });

  afterEach(async () => {
    await services[destroy]();
  });

  let counter = 0;
  const nextId = (): string => {
    counter++;
    return `session-${counter}`;
  };

  it('creates a session', async () => {
    const session = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Fix the bug',
    });

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe(userId);
    expect(session.status).toBe('pending');
    expect(session.error).toBeNull();
  });

  it('lists sessions for a user', async () => {
    await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task 1',
    });
    await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task 2',
    });

    const sessions = await sessionService.list(userId);
    expect(sessions).toHaveLength(2);
  });

  it('gets a session by userId and sessionId', async () => {
    const created = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task',
    });

    const session = await sessionService.get({ userId, sessionId: created.id });
    expect(session.id).toBe(created.id);
    expect(session.prompt).toBe('Task');
  });

  it('throws SessionNotFoundError for non-existent session', async () => {
    await expect(
      sessionService.get({ userId, sessionId: 'non-existent' }),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('throws SessionNotFoundError for cross-user access', async () => {
    const session = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task',
    });

    await expect(
      sessionService.get({ userId: 'other-user', sessionId: session.id }),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('updates session status', async () => {
    const session = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task',
    });

    const ref: SessionRef = sessionRef(session);
    await sessionService.updateStatus({ ref, status: 'running' });
    const updated = await sessionService.get({ userId, sessionId: session.id });
    expect(updated.status).toBe('running');
  });

  it('updates session status with error', async () => {
    const session = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task',
    });

    const ref: SessionRef = sessionRef(session);
    await sessionService.updateStatus({
      ref,
      status: 'failed',
      error: 'Something went wrong',
    });
    const updated = await sessionService.get({ userId, sessionId: session.id });
    expect(updated.status).toBe('failed');
    expect(updated.error).toBe('Something went wrong');
  });

  it('deletes a session', async () => {
    const session = await sessionService.create({
      id: nextId(),
      userId,
      repoId,
      identityId,
      repoUrl,
      branch: 'main',
      prompt: 'Task',
    });

    const ref: SessionRef = sessionRef(session);
    await sessionService.delete(ref);
    await expect(
      sessionService.get({ userId, sessionId: session.id }),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('throws SessionNotFoundError when deleting non-existent session', async () => {
    await expect(
      sessionService.delete({ userId, repoId, sessionId: 'non-existent' }),
    ).rejects.toThrow(SessionNotFoundError);
  });
});
