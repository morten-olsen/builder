import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import convict from 'convict';

const configSchema = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  server: {
    port: {
      doc: 'The port to bind to',
      format: 'port',
      default: 4120,
      env: 'PORT',
    },
    host: {
      doc: 'The host to bind to',
      format: String,
      default: '0.0.0.0',
      env: 'HOST',
    },
  },
  db: {
    path: {
      doc: 'Path to the SQLite database file (or :memory:)',
      format: String,
      default: ':memory:',
      env: 'DB_PATH',
    },
  },
  jwt: {
    secret: {
      doc: 'Secret key for signing JWTs (random per-process if not set)',
      format: String,
      default: randomBytes(32).toString('hex'),
      env: 'JWT_SECRET',
      sensitive: true,
    },
    expiresIn: {
      doc: 'JWT token expiration time',
      format: String,
      default: '24h',
      env: 'JWT_EXPIRES_IN',
    },
  },
  encryption: {
    key: {
      doc: 'AES-256 key for encrypting secrets at rest (64 hex chars, random if not set)',
      format: String,
      default: randomBytes(32).toString('hex'),
      env: 'ENCRYPTION_KEY',
      sensitive: true,
    },
  },
  session: {
    dataDir: {
      doc: 'Base directory for repos and worktrees',
      format: String,
      default: path.join(os.tmpdir(), 'builder-data'),
      env: 'SESSION_DATA_DIR',
    },
  },
  agent: {
    provider: {
      doc: 'Agent provider to use',
      format: String,
      default: 'claude',
      env: 'AGENT_PROVIDER',
    },
    apiKey: {
      doc: 'API key for the agent provider',
      format: String,
      default: '',
      env: 'ANTHROPIC_API_KEY',
      sensitive: true,
    },
    model: {
      doc: 'Model to use for the agent',
      format: String,
      default: 'sonnet',
      env: 'AGENT_MODEL',
    },
  },
});

type Config = ReturnType<typeof configSchema.getProperties>;

const createConfig = (): Config => {
  configSchema.validate({ allowed: 'warn' });
  return configSchema.getProperties();
};

export type { Config };
export { configSchema, createConfig };
