import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';

import { AuthService } from './auth.js';
import { UserAlreadyExistsError, InvalidCredentialsError, InvalidTokenError } from './auth.errors.js';

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
    const result = await auth.register({ id: 'alice', password: 'secret123' });

    expect(result.token).toBeTruthy();
    expect(result.user.id).toBe('alice');
  });

  it('rejects duplicate id on register', async () => {
    await auth.register({ id: 'dup-user', password: 'pass1' });

    await expect(
      auth.register({ id: 'dup-user', password: 'pass2' }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('logs in with valid credentials', async () => {
    await auth.register({ id: 'bob', password: 'mypass' });
    const result = await auth.login({ id: 'bob', password: 'mypass' });

    expect(result.token).toBeTruthy();
    expect(result.user.id).toBe('bob');
  });

  it('rejects login with wrong password', async () => {
    await auth.register({ id: 'carol', password: 'correct' });

    await expect(
      auth.login({ id: 'carol', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects login with non-existent id', async () => {
    await expect(
      auth.login({ id: 'nobody', password: 'anything' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('verifies a valid token', async () => {
    const { token } = await auth.register({ id: 'dave', password: 'pass' });
    const payload = await auth.verifyToken(token);

    expect(payload.sub).toBe('dave');
  });

  it('rejects an invalid token', async () => {
    await expect(auth.verifyToken('garbage.token.here')).rejects.toThrow(InvalidTokenError);
  });

  it('getMe returns user profile', async () => {
    const { user } = await auth.register({ id: 'eve', password: 'pass' });
    const me = await auth.getMe(user.id);

    expect(me.id).toBe('eve');
  });
});
