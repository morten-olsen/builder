import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from '../src/app/app.js';
import { registerAllRoutes } from '../src/app/app.routes.js';
import { createTestConfig } from '../src/config/config.testing.js';
import { Services } from '../src/container/container.js';

const extract = async (): Promise<void> => {
  const config = createTestConfig();
  const services = new Services(config);
  const app = await createApp({ services, config });

  registerAllRoutes(app);

  await app.ready();

  const spec = app.swagger();
  const dir = resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'client');
  writeFileSync(resolve(dir, 'openapi.json'), JSON.stringify(spec, null, 2));

  await app.close();
};

extract().catch((err) => {
  console.error('Failed to extract OpenAPI spec:', err);
  process.exit(1);
});
