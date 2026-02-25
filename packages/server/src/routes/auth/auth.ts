import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { AuthService } from '../../services/auth/auth.js';

import {
  registerBodySchema,
  loginBodySchema,
  changePasswordBodySchema,
  authResponseSchema,
  meResponseSchema,
  successResponseSchema,
  errorResponseSchema,
} from './auth.schemas.js';

const registerAuthRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/api/auth/register', {
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

  typedApp.post('/api/auth/login', {
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

  typedApp.get('/api/auth/me', {
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

  typedApp.put('/api/auth/password', {
    onRequest: [app.authenticate],
    schema: {
      body: changePasswordBodySchema,
      response: {
        200: successResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      await app.services.get(AuthService).changePassword({
        userId: request.user.sub,
        currentPassword: request.body.currentPassword,
        newPassword: request.body.newPassword,
      });
      reply.send({ success: true as const });
    },
  });
};

export { registerAuthRoutes };
