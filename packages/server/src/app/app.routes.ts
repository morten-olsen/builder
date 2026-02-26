import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from '../routes/auth/auth.js';
import { registerEventRoutes } from '../routes/events/events.js';
import { registerIdentityRoutes } from '../routes/identities/identities.js';
import { registerRepoRoutes } from '../routes/repos/repos.js';
import { registerSessionRoutes } from '../routes/sessions/sessions.js';
import { registerReviewRoutes } from '../routes/sessions/sessions.review.js';
import { registerModelRoutes } from '../routes/models/models.js';
import { registerNotificationRoutes } from '../routes/notifications/notifications.js';
import { registerWsRoutes } from '../routes/ws/ws.js';

const registerAllRoutes = (app: FastifyInstance): void => {
  registerAuthRoutes(app);
  registerEventRoutes(app);
  registerIdentityRoutes(app);
  registerRepoRoutes(app);
  registerSessionRoutes(app);
  registerReviewRoutes(app);
  registerModelRoutes(app);
  registerNotificationRoutes(app);
  registerWsRoutes(app);
};

export { registerAllRoutes };
