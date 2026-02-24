import { randomBytes } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { encryptPrivateKey, decryptPrivateKey, generateSshKeyPair } from './identity.utils.js';

const testKey = 'a'.repeat(64);

describe('identity utils', () => {
  describe('encryptPrivateKey / decryptPrivateKey', () => {
    it('round-trips plaintext through encrypt and decrypt', () => {
      const plaintext = 'my-secret-private-key-data';
      const encrypted = encryptPrivateKey(plaintext, testKey);
      const decrypted = decryptPrivateKey(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('produces format iv:authTag:ciphertext', () => {
      const encrypted = encryptPrivateKey('test', testKey);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]{24}$/); // 12 bytes = 24 hex chars
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16 bytes = 32 hex chars
      expect(parts[2]).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different ciphertext each time (random IV)', () => {
      const plaintext = 'same-data';
      const a = encryptPrivateKey(plaintext, testKey);
      const b = encryptPrivateKey(plaintext, testKey);

      expect(a).not.toBe(b);

      expect(decryptPrivateKey(a, testKey)).toBe(plaintext);
      expect(decryptPrivateKey(b, testKey)).toBe(plaintext);
    });

    it('fails to decrypt with a wrong key', () => {
      const encrypted = encryptPrivateKey('secret', testKey);
      const wrongKey = randomBytes(32).toString('hex');

      expect(() => decryptPrivateKey(encrypted, wrongKey)).toThrow();
    });
  });

  describe('generateSshKeyPair', () => {
    it('generates a key pair in OpenSSH format', () => {
      const { publicKey, privateKey } = generateSshKeyPair();

      expect(publicKey).toMatch(/^ssh-ed25519 [A-Za-z0-9+/=]+/);
      expect(privateKey).toContain('-----BEGIN OPENSSH PRIVATE KEY-----');
    });

    it('generates unique key pairs each time', () => {
      const a = generateSshKeyPair();
      const b = generateSshKeyPair();

      expect(a.publicKey).not.toBe(b.publicKey);
      expect(a.privateKey).not.toBe(b.privateKey);
    });
  });
});
