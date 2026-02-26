import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';

import { modelListResponseSchema } from './models.schemas.js';
import { errorResponseSchema } from '../sessions/sessions.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const sdkModels = [
  { id: 'sonnet', displayName: 'Sonnet' },
  { id: 'opus', displayName: 'Opus' },
  { id: 'haiku', displayName: 'Haiku' },
] as const;

const registerModelRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/api/models', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: modelListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      requireUser(request.user, reply);

      const result = sdkModels.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        createdAt: '',
      }));

      reply.send(result);
    },
  });
};

export { registerModelRoutes };
