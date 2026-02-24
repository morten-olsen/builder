import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { AuthService } from '../../services/auth/auth.js';

import {
  registerBodySchema,
  loginBodySchema,
  authResponseSchema,
  meResponseSchema,
  errorResponseSchema,
} from './auth.schemas.js';

const registerAuthRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/auth/register', {
    schema: {
      body: registerBodySchema,
      response: {
        200: authResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const result = await app.services.get(AuthService).register(request.body);
      reply.send(result);
    },
  });

  typedApp.post('/auth/login', {
    schema: {
      body: loginBodySchema,
      response: {
        200: authResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const result = await app.services.get(AuthService).login(request.body);
      reply.send(result);
    },
  });

  typedApp.get('/auth/me', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: meResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const me = await app.services.get(AuthService).getMe(request.user.sub);
      reply.send(me);
    },
  });
};

export { registerAuthRoutes };
