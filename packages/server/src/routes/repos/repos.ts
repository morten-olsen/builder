import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { RepoService } from '../../services/repo/repo.js';
import { SessionService } from '../../services/session/session.js';
import { sessionListResponseSchema } from '../sessions/sessions.schemas.js';

import {
  repoParamsSchema,
  createRepoBodySchema,
  updateRepoBodySchema,
  repoResponseSchema,
  repoListResponseSchema,
  errorResponseSchema,
} from './repos.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerRepoRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/repos', {
    onRequest: [app.authenticate],
    schema: {
      body: createRepoBodySchema,
      response: {
        201: repoResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repo = await app.services.get(RepoService).create({
        userId: user.sub,
        name: request.body.name,
        repoUrl: request.body.repoUrl,
        defaultBranch: request.body.defaultBranch,
        defaultIdentityId: request.body.defaultIdentityId,
      });
      reply.code(201).send(repo);
    },
  });

  typedApp.get('/repos', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: repoListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repos = await app.services.get(RepoService).list(user.sub);
      reply.send(repos);
    },
  });

  typedApp.get('/repos/:repoId', {
    onRequest: [app.authenticate],
    schema: {
      params: repoParamsSchema,
      response: {
        200: repoResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repo = await app.services.get(RepoService).get({
        userId: user.sub,
        repoId: request.params.repoId,
      });
      reply.send(repo);
    },
  });

  typedApp.put('/repos/:repoId', {
    onRequest: [app.authenticate],
    schema: {
      params: repoParamsSchema,
      body: updateRepoBodySchema,
      response: {
        200: repoResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repo = await app.services.get(RepoService).update({
        userId: user.sub,
        repoId: request.params.repoId,
        ...request.body,
      });
      reply.send(repo);
    },
  });

  typedApp.delete('/repos/:repoId', {
    onRequest: [app.authenticate],
    schema: {
      params: repoParamsSchema,
      response: {
        204: z.undefined().describe('No content'),
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      await app.services.get(RepoService).delete({
        userId: user.sub,
        repoId: request.params.repoId,
      });
      reply.code(204).send();
    },
  });

  typedApp.get('/repos/:repoId/sessions', {
    onRequest: [app.authenticate],
    schema: {
      params: repoParamsSchema,
      response: {
        200: sessionListResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      // Verify repo ownership
      await app.services.get(RepoService).get({
        userId: user.sub,
        repoId: request.params.repoId,
      });
      const sessions = await app.services.get(SessionService).listByRepo({
        userId: user.sub,
        repoId: request.params.repoId,
      });
      reply.send(sessions);
    },
  });
};

export { registerRepoRoutes };
