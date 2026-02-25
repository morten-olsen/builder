import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import { encrypt, decrypt } from '../../utils/crypto.js';

import { IdentityError } from './identity.errors.js';

const encryptPrivateKey = encrypt;
const decryptPrivateKey = decrypt;

const generateSshKeyPair = (): { publicKey: string; privateKey: string } => {
  const keyPath = join(tmpdir(), `builder-keygen-${randomBytes(8).toString('hex')}`);
  try {
    execSync(`ssh-keygen -t ed25519 -f ${keyPath} -N "" -q -C ""`, { stdio: 'pipe' });
    const privateKey = readFileSync(keyPath, 'utf8');
    const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim().replace(/\s+$/, '');
    return { publicKey, privateKey };
  } finally {
    try { unlinkSync(keyPath); } catch { /* ignore */ }
    try { unlinkSync(`${keyPath}.pub`); } catch { /* ignore */ }
  }
};

const derivePublicKeyFromPrivate = (privateKey: string): string => {
  const keyPath = join(tmpdir(), `builder-derive-${randomBytes(8).toString('hex')}`);
  try {
    writeFileSync(keyPath, privateKey, { mode: 0o600 });
    const publicKey = execSync(`ssh-keygen -y -f ${keyPath}`, { stdio: 'pipe' }).toString().trim();
    return publicKey;
  } catch {
    throw new IdentityError('Invalid private key format');
  } finally {
    try { unlinkSync(keyPath); } catch { /* ignore */ }
  }
};

export { encryptPrivateKey, decryptPrivateKey, generateSshKeyPair, derivePublicKeyFromPrivate };
