import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { IdentityForbiddenError } from '../../services/identity/identity.errors.js';
import { IdentityService } from '../../services/identity/identity.js';

import {
  userParamsSchema,
  identityParamsSchema,
  createIdentityBodySchema,
  updateIdentityBodySchema,
  identityResponseSchema,
  identityListResponseSchema,
  errorResponseSchema,
} from './identities.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const assertOwnership = (tokenSub: string, paramsUserId: string): void => {
  if (tokenSub !== paramsUserId) {
    throw new IdentityForbiddenError();
  }
};

const registerIdentityRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/users/:userId/identities', {
    onRequest: [app.authenticate],
    schema: {
      params: userParamsSchema,
      response: {
        200: identityListResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      assertOwnership(user.sub, request.params.userId);
      const identities = await app.services.get(IdentityService).list(request.params.userId);
      reply.send(identities);
    },
  });

  typedApp.post('/users/:userId/identities', {
    onRequest: [app.authenticate],
    schema: {
      params: userParamsSchema,
      body: createIdentityBodySchema,
      response: {
        201: identityResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      assertOwnership(user.sub, request.params.userId);
      const identity = await app.services.get(IdentityService).create({
        userId: request.params.userId,
        ...request.body,
      });
      reply.code(201).send(identity);
    },
  });

  typedApp.get('/users/:userId/identities/:identityId', {
    onRequest: [app.authenticate],
    schema: {
      params: identityParamsSchema,
      response: {
        200: identityResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      assertOwnership(user.sub, request.params.userId);
      const identity = await app.services
        .get(IdentityService)
        .get({ userId: request.params.userId, identityId: request.params.identityId });
      reply.send(identity);
    },
  });

  typedApp.put('/users/:userId/identities/:identityId', {
    onRequest: [app.authenticate],
    schema: {
      params: identityParamsSchema,
      body: updateIdentityBodySchema,
      response: {
        200: identityResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      assertOwnership(user.sub, request.params.userId);
      const identity = await app.services.get(IdentityService).update({
        userId: request.params.userId,
        identityId: request.params.identityId,
        ...request.body,
      });
      reply.send(identity);
    },
  });

  typedApp.delete('/users/:userId/identities/:identityId', {
    onRequest: [app.authenticate],
    schema: {
      params: identityParamsSchema,
      response: {
        204: z.undefined().describe('No content'),
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      assertOwnership(user.sub, request.params.userId);
      await app.services
        .get(IdentityService)
        .delete({ userId: request.params.userId, identityId: request.params.identityId });
      reply.code(204).send();
    },
  });
};

export { registerIdentityRoutes };
