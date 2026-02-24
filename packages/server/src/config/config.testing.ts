import os from 'node:os';
import path from 'node:path';

import type { Config } from './config.js';

const defaultTestConfig: Config = {
  env: 'test',
  server: { port: 3000, host: '0.0.0.0' },
  db: { path: ':memory:' },
  jwt: { secret: 'test-secret-key', expiresIn: '24h' },
  encryption: { key: 'a'.repeat(64) },
  session: { dataDir: path.join(os.tmpdir(), 'builder-test-data') },
  agent: { provider: 'mock', apiKey: '', model: 'claude-sonnet-4-20250514' },
};

const createTestConfig = (overrides?: Partial<Config>): Config => ({
  ...defaultTestConfig,
  ...overrides,
});

export { createTestConfig };
