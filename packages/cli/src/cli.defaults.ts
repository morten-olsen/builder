import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import 'dotenv/config';

const BUILDER_HOME = path.join(os.homedir(), '.builder');

type Secrets = {
  jwtSecret: string;
  encryptionKey: string;
};

const SECRETS_FILE = path.join(BUILDER_HOME, 'secrets.json');

const loadOrCreateSecrets = (): Secrets => {
  try {
    const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
    return JSON.parse(raw) as Secrets;
  } catch {
    const secrets: Secrets = {
      jwtSecret: randomBytes(32).toString('hex'),
      encryptionKey: randomBytes(32).toString('hex'),
    };
    fs.mkdirSync(BUILDER_HOME, { recursive: true, mode: 0o700 });
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), { mode: 0o600 });
    return secrets;
  }
};

const setDefaultEnv = (key: string, value: string): void => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

const applyCliDefaults = (): void => {
  const secrets = loadOrCreateSecrets();

  setDefaultEnv('DB_PATH', path.join(BUILDER_HOME, 'builder.db'));
  setDefaultEnv('SESSION_DATA_DIR', path.join(BUILDER_HOME, 'data'));
  setDefaultEnv('JWT_SECRET', secrets.jwtSecret);
  setDefaultEnv('ENCRYPTION_KEY', secrets.encryptionKey);
  setDefaultEnv('BUILDER_SERVER_URL', 'http://localhost:4120');
};

// Auto-apply at import time — this module MUST be imported before @morten-olsen/builder-server
// so that env vars are set before convict reads them at schema definition time.
applyCliDefaults();

export { BUILDER_HOME, applyCliDefaults };
