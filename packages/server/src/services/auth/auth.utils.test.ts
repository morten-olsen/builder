import { describe, it, expect } from 'vitest';

import { hashPassword, verifyPassword } from './auth.utils.js';

describe('auth utils', () => {
  it('hashes and verifies a password', async () => {
    const hashed = await hashPassword('my-secret');
    const valid = await verifyPassword('my-secret', hashed);
    expect(valid).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hashed = await hashPassword('my-secret');
    const valid = await verifyPassword('wrong-password', hashed);
    expect(valid).toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
