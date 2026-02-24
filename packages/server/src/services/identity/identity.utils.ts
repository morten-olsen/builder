import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const encryptPrivateKey = (plaintext: string, keyHex: string): string => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptPrivateKey = (stored: string, keyHex: string): string => {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final('utf8');
};

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

export { encryptPrivateKey, decryptPrivateKey, generateSshKeyPair };
