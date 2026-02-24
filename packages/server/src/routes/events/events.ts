import type { FastifyInstance, FastifyReply } from 'fastify';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { EventBusService } from '../../sse/event-bus.js';
import { streamUserEvents } from '../../sse/stream.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerEventRoutes = (app: FastifyInstance): void => {
  app.get('/events', {
    onRequest: [app.authenticate],
    schema: {
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);

      reply.hijack();

      await streamUserEvents({
        reply,
        userId: user.sub,
        eventBus: app.services.get(EventBusService),
      });
    },
  });
};

export { registerEventRoutes };
