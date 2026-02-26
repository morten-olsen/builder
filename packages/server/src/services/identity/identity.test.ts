import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { AuthService } from '../auth/auth.js';

import { IdentityNotFoundError } from './identity.errors.js';
import { IdentityService } from './identity.js';

describe('IdentityService', () => {
  let services: Services;
  let identity: IdentityService;
  let userId: string;

  beforeEach(async () => {
    services = new Services(createTestConfig());
    identity = services.get(IdentityService);

    const auth = services.get(AuthService);
    const { user } = await auth.register({ id: 'test-user', password: 'password123' });
    userId = user.id;
  });

  afterEach(async () => {
    await services[destroy]();
  });

  describe('create', () => {
    it('creates an identity with generated keys', async () => {
      const result = await identity.create({
        id: 'work',
        userId,
        name: 'Work',
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@work.com',
      });

      expect(result.id).toBe('work');
      expect(result.name).toBe('Work');
      expect(result.gitAuthorName).toBe('Alice');
      expect(result.gitAuthorEmail).toBe('alice@work.com');
      expect(result.publicKey).toMatch(/^ssh-ed25519 /);
      expect(result.userId).toBe(userId);
    });

    it('creates an identity with imported keys', async () => {
      const result = await identity.create({
        id: 'imported',
        userId,
        name: 'Imported',
        gitAuthorName: 'Bob',
        gitAuthorEmail: 'bob@example.com',
        publicKey: 'ssh-ed25519 AAAA...',
        privateKey: 'private-key-data',
      });

      expect(result.publicKey).toBe('ssh-ed25519 AAAA...');
    });
  });

  describe('list', () => {
    it('returns all identities for the user', async () => {
      await identity.create({
        id: 'first',
        userId,
        name: 'First',
        gitAuthorName: 'A',
        gitAuthorEmail: 'a@test.com',
      });
      await identity.create({
        id: 'second',
        userId,
        name: 'Second',
        gitAuthorName: 'B',
        gitAuthorEmail: 'b@test.com',
      });

      const list = await identity.list(userId);

      expect(list).toHaveLength(2);
      const names = list.map((i) => i.name);
      expect(names).toContain('First');
      expect(names).toContain('Second');
    });

    it('returns empty array for user with no identities', async () => {
      const list = await identity.list(userId);
      expect(list).toEqual([]);
    });
  });

  describe('get', () => {
    it('returns a single identity', async () => {
      const created = await identity.create({
        id: 'test-id',
        userId,
        name: 'Test',
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@test.com',
      });

      const result = await identity.get({ userId, identityId: created.id });

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Test');
    });

    it('throws IdentityNotFoundError for non-existent identity', async () => {
      await expect(
        identity.get({ userId, identityId: 'non-existent' }),
      ).rejects.toThrow(IdentityNotFoundError);
    });

    it('throws IdentityNotFoundError for another user\'s identity', async () => {
      const created = await identity.create({
        id: 'mine',
        userId,
        name: 'Mine',
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@test.com',
      });

      const auth = services.get(AuthService);
      const { user: otherUser } = await auth.register({ id: 'other-user', password: 'password123' });

      await expect(
        identity.get({ userId: otherUser.id, identityId: created.id }),
      ).rejects.toThrow(IdentityNotFoundError);
    });
  });

  describe('update', () => {
    it('updates name and git author fields', async () => {
      const created = await identity.create({
        id: 'old-id',
        userId,
        name: 'Old',
        gitAuthorName: 'Old Name',
        gitAuthorEmail: 'old@test.com',
      });

      const updated = await identity.update({
        userId,
        identityId: created.id,
        name: 'New',
        gitAuthorName: 'New Name',
        gitAuthorEmail: 'new@test.com',
      });

      expect(updated.name).toBe('New');
      expect(updated.gitAuthorName).toBe('New Name');
      expect(updated.gitAuthorEmail).toBe('new@test.com');
      expect(updated.publicKey).toBe(created.publicKey);
    });

    it('partially updates only provided fields', async () => {
      const created = await identity.create({
        id: 'original-id',
        userId,
        name: 'Original',
        gitAuthorName: 'Name',
        gitAuthorEmail: 'email@test.com',
      });

      const updated = await identity.update({
        userId,
        identityId: created.id,
        name: 'Updated',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.gitAuthorName).toBe('Name');
      expect(updated.gitAuthorEmail).toBe('email@test.com');
    });

    it('throws IdentityNotFoundError for non-existent identity', async () => {
      await expect(
        identity.update({ userId, identityId: 'non-existent', name: 'X' }),
      ).rejects.toThrow(IdentityNotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes an identity', async () => {
      const created = await identity.create({
        id: 'to-delete',
        userId,
        name: 'ToDelete',
        gitAuthorName: 'A',
        gitAuthorEmail: 'a@test.com',
      });

      await identity.delete({ userId, identityId: created.id });

      await expect(
        identity.get({ userId, identityId: created.id }),
      ).rejects.toThrow(IdentityNotFoundError);
    });

    it('throws IdentityNotFoundError when deleting non-existent identity', async () => {
      await expect(
        identity.delete({ userId, identityId: 'non-existent' }),
      ).rejects.toThrow(IdentityNotFoundError);
    });
  });

  describe('getPrivateKey', () => {
    it('decrypts and returns the private key', async () => {
      const created = await identity.create({
        id: 'with-key',
        userId,
        name: 'WithKey',
        gitAuthorName: 'Alice',
        gitAuthorEmail: 'alice@test.com',
      });

      const privateKey = await identity.getPrivateKey({ userId, identityId: created.id });

      expect(privateKey).toContain('-----BEGIN OPENSSH PRIVATE KEY-----');
    });

    it('returns imported private key after decryption', async () => {
      await identity.create({
        id: 'imported-key',
        userId,
        name: 'Imported',
        gitAuthorName: 'Bob',
        gitAuthorEmail: 'bob@test.com',
        publicKey: 'pub-key',
        privateKey: 'my-secret-private-key',
      });

      const list = await identity.list(userId);
      const privateKey = await identity.getPrivateKey({ userId, identityId: list[0].id });

      expect(privateKey).toBe('my-secret-private-key');
    });

    it('throws IdentityNotFoundError for non-existent identity', async () => {
      await expect(
        identity.getPrivateKey({ userId, identityId: 'non-existent' }),
      ).rejects.toThrow(IdentityNotFoundError);
    });
  });
});
