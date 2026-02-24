import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { registerAuthRoutes } from '../auth/auth.js';

import { registerIdentityRoutes } from './identities.js';

describe('identity routes', () => {
  let services: Services;
  let app: Awaited<ReturnType<typeof createApp>>;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    const config = createTestConfig();
    services = new Services(config);
    app = await createApp({ services, config });
    registerAuthRoutes(app);
    registerIdentityRoutes(app);
    await app.ready();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const body = registerRes.json();
    token = body.token;
    userId = body.user.id;
  });

  afterEach(async () => {
    await app.close();
    await services[destroy]();
  });

  const authHeader = (): Record<string, string> => ({ authorization: `Bearer ${token}` });

  const createIdentity = async (name = 'Test Identity'): Promise<Record<string, unknown>> => {
    const res = await app.inject({
      method: 'POST',
      url: `/users/${userId}/identities`,
      headers: authHeader(),
      payload: {
        name,
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@test.com',
      },
    });
    return res.json();
  };

  describe('POST /users/:userId/identities', () => {
    it('creates an identity with generated keys', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${userId}/identities`,
        headers: authHeader(),
        payload: {
          name: 'Work',
          gitAuthorName: 'Alice',
          gitAuthorEmail: 'alice@work.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.name).toBe('Work');
      expect(body.publicKey).toMatch(/^ssh-ed25519 /);
      expect(body.userId).toBe(userId);
    });

    it('creates an identity with imported keys', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${userId}/identities`,
        headers: authHeader(),
        payload: {
          name: 'Imported',
          gitAuthorName: 'Bob',
          gitAuthorEmail: 'bob@test.com',
          publicKey: 'ssh-ed25519 AAAA...',
          privateKey: 'private-key-data',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().publicKey).toBe('ssh-ed25519 AAAA...');
    });

    it('returns 400 when only publicKey is provided without privateKey', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${userId}/identities`,
        headers: authHeader(),
        payload: {
          name: 'Bad',
          gitAuthorName: 'Alice',
          gitAuthorEmail: 'alice@test.com',
          publicKey: 'some-key',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/users/${userId}/identities`,
        payload: {
          name: 'No Auth',
          gitAuthorName: 'Alice',
          gitAuthorEmail: 'alice@test.com',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for different user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users/other-user-id/identities',
        headers: authHeader(),
        payload: {
          name: 'Forbidden',
          gitAuthorName: 'Alice',
          gitAuthorEmail: 'alice@test.com',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /users/:userId/identities', () => {
    it('lists identities for a user', async () => {
      await createIdentity('First');
      await createIdentity('Second');

      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(2);
    });

    it('returns empty array when no identities exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for different user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/other-user-id/identities',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /users/:userId/identities/:identityId', () => {
    it('returns a single identity', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe('Test Identity');
    });

    it('returns 404 for non-existent identity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities/non-existent`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities/some-id`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for different user', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'GET',
        url: `/users/other-user-id/identities/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /users/:userId/identities/:identityId', () => {
    it('updates an identity', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}/identities/${created.id}`,
        headers: authHeader(),
        payload: {
          name: 'Updated Name',
          gitAuthorName: 'New Author',
          gitAuthorEmail: 'new@test.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('Updated Name');
      expect(body.gitAuthorName).toBe('New Author');
      expect(body.gitAuthorEmail).toBe('new@test.com');
    });

    it('partially updates an identity', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}/identities/${created.id}`,
        headers: authHeader(),
        payload: { name: 'Just Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('Just Name');
      expect(body.gitAuthorName).toBe('Alice');
    });

    it('returns 404 for non-existent identity', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}/identities/non-existent`,
        headers: authHeader(),
        payload: { name: 'Nope' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/users/${userId}/identities/some-id`,
        payload: { name: 'X' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for different user', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'PUT',
        url: `/users/other-user-id/identities/${created.id}`,
        headers: authHeader(),
        payload: { name: 'Forbidden' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /users/:userId/identities/:identityId', () => {
    it('deletes an identity', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${userId}/identities/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(204);

      const getRes = await app.inject({
        method: 'GET',
        url: `/users/${userId}/identities/${created.id}`,
        headers: authHeader(),
      });
      expect(getRes.statusCode).toBe(404);
    });

    it('returns 404 for non-existent identity', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${userId}/identities/non-existent`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${userId}/identities/some-id`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for different user', async () => {
      const created = await createIdentity();

      const response = await app.inject({
        method: 'DELETE',
        url: `/users/other-user-id/identities/${created.id}`,
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
