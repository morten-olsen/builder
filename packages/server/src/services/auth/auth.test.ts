import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';

import { AuthService } from './auth.js';
import { EmailAlreadyExistsError, InvalidCredentialsError, InvalidTokenError } from './auth.errors.js';

describe('AuthService', () => {
  let services: Services;
  let auth: AuthService;

  beforeEach(() => {
    services = new Services(createTestConfig());
    auth = services.get(AuthService);
  });

  afterEach(async () => {
    await services[destroy]();
  });

  it('registers a new user and returns a token', async () => {
    const result = await auth.register({ email: 'alice@example.com', password: 'secret123' });

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.id).toBeTruthy();
  });

  it('rejects duplicate email on register', async () => {
    await auth.register({ email: 'dup@example.com', password: 'pass1' });

    await expect(
      auth.register({ email: 'dup@example.com', password: 'pass2' }),
    ).rejects.toThrow(EmailAlreadyExistsError);
  });

  it('logs in with valid credentials', async () => {
    await auth.register({ email: 'bob@example.com', password: 'mypass' });
    const result = await auth.login({ email: 'bob@example.com', password: 'mypass' });

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('bob@example.com');
  });

  it('rejects login with wrong password', async () => {
    await auth.register({ email: 'carol@example.com', password: 'correct' });

    await expect(
      auth.login({ email: 'carol@example.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects login with non-existent email', async () => {
    await expect(
      auth.login({ email: 'nobody@example.com', password: 'anything' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('verifies a valid token', async () => {
    const { token } = await auth.register({ email: 'dave@example.com', password: 'pass' });
    const payload = await auth.verifyToken(token);

    expect(payload.email).toBe('dave@example.com');
    expect(payload.sub).toBeTruthy();
  });

  it('rejects an invalid token', async () => {
    await expect(auth.verifyToken('garbage.token.here')).rejects.toThrow(InvalidTokenError);
  });

  it('getMe returns user profile', async () => {
    const { user } = await auth.register({ email: 'eve@example.com', password: 'pass' });
    const me = await auth.getMe(user.id);

    expect(me.email).toBe('eve@example.com');
    expect(me.id).toBe(user.id);
  });
});
