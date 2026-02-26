import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';

import { registerAuthRoutes } from './auth.js';

describe('auth routes', () => {
  let services: Services;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    const config = createTestConfig();
    services = new Services(config);
    app = await createApp({ services, config });
    registerAuthRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await services[destroy]();
  });

  describe('POST /auth/register', () => {
    it('registers a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'alice', password: 'password123' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeTruthy();
      expect(body.user.id).toBe('alice');
    });

    it('returns 409 for duplicate id', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'dup-user', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'dup-user', password: 'password456' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 400 for invalid id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'NOT-VALID!', password: 'password123' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'test-user', password: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with valid credentials', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'login-user', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { id: 'login-user', password: 'password123' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeTruthy();
      expect(body.user.id).toBe('login-user');
    });

    it('returns 401 for wrong password', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'login2', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { id: 'login2', password: 'wrongpass' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { id: 'nobody', password: 'anything' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile with valid token', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'me-user', password: 'password123' },
      });
      const { token } = registerRes.json();

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe('me-user');
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: 'Bearer invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /auth/password', () => {
    it('changes password successfully', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'changepw', password: 'oldpassword1' },
      });
      const { token } = registerRes.json();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: 'oldpassword1', newPassword: 'newpassword1' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });

      const loginNew = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { id: 'changepw', password: 'newpassword1' },
      });
      expect(loginNew.statusCode).toBe(200);

      const loginOld = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { id: 'changepw', password: 'oldpassword1' },
      });
      expect(loginOld.statusCode).toBe(401);
    });

    it('returns 401 for wrong current password', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'wrongpw', password: 'password123' },
      });
      const { token } = registerRes.json();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: 'wrongpassword', newPassword: 'newpassword1' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for new password too short', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { id: 'shortpw', password: 'password123' },
      });
      const { token } = registerRes.json();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: 'password123', newPassword: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/auth/password',
        payload: { currentPassword: 'password123', newPassword: 'newpassword1' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
