import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createApp } from '../../app/app.js';
import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { NotificationService } from '../../services/notification/notification.js';
import { createNtfyProvider } from '../../services/notification/notification.ntfy.js';
import { registerAuthRoutes } from '../auth/auth.js';

import { registerNotificationRoutes } from './notifications.js';

describe('notification routes', () => {
  let services: Services;
  let app: Awaited<ReturnType<typeof createApp>>;
  let token: string;

  beforeEach(async () => {
    const config = createTestConfig({});
    services = new Services(config);

    const notificationService = services.get(NotificationService);
    notificationService.registerProvider(createNtfyProvider());

    app = await createApp({ services, config });
    registerAuthRoutes(app);
    registerNotificationRoutes(app);
    await app.ready();

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { id: 'test-user', password: 'password123' },
    });
    token = JSON.parse(regRes.body).token;
  });

  afterEach(async () => {
    await app.close();
    await services[destroy]();
  });

  it('returns registered providers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notification-channels/providers',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual(['ntfy']);
  });
});
