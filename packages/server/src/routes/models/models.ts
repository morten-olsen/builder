import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { AgentService } from '../../services/agent/agent.js';
import { errorResponseSchema } from '../sessions/sessions.schemas.js';

import { modelListResponseSchema, agentProviderListResponseSchema } from './models.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

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

      const agentService = app.services.get(AgentService);
      const providerNames = agentService.getProviderNames();

      const allModels = await Promise.all(
        providerNames.map(async (name) => {
          const provider = agentService.getProvider(name);
          const models = provider.getModels ? await provider.getModels() : [];
          return models.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            provider: name,
            createdAt: '',
          }));
        }),
      );

      reply.send(allModels.flat());
    },
  });

  typedApp.get('/api/providers', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: agentProviderListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      requireUser(request.user, reply);

      const agentService = app.services.get(AgentService);
      const providerNames = agentService.getProviderNames();

      reply.send(providerNames.map((name) => ({ name })));
    },
  });
};

export { registerModelRoutes };
