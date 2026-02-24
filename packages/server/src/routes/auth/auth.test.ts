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
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeTruthy();
      expect(body.user.email).toBe('test@example.com');
    });

    it('returns 409 for duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'dup@example.com', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'dup@example.com', password: 'password456' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'not-an-email', password: 'password123' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@example.com', password: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with valid credentials', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'login@example.com', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'login@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeTruthy();
      expect(body.user.email).toBe('login@example.com');
    });

    it('returns 401 for wrong password', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'login2@example.com', password: 'password123' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'login2@example.com', password: 'wrongpass' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'anything' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile with valid token', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'me@example.com', password: 'password123' },
      });
      const { token } = registerRes.json();

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.email).toBe('me@example.com');
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: 'Bearer invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
