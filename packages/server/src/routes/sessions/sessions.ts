import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { AgentService } from '../../services/agent/agent.js';
import { RepoService } from '../../services/repo/repo.js';
import { SessionService } from '../../services/session/session.js';
import { SessionEventService } from '../../services/session-event/session-event.js';
import { MessageService } from '../../services/message/message.js';
import { startSession, sendSessionMessage, interruptSession, stopSession, revertSession } from '../../services/session/session.runner.js';
import { EventBusService } from '../../sse/event-bus.js';
import { streamSessionEvents } from '../../sse/stream.js';

import {
  sessionParamsSchema,
  createSessionBodySchema,
  sendMessageBodySchema,
  revertSessionBodySchema,
  messageListResponseSchema,
  sessionResponseSchema,
  sessionListResponseSchema,
  errorResponseSchema,
} from './sessions.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerSessionRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/sessions', {
    onRequest: [app.authenticate],
    schema: {
      body: createSessionBodySchema,
      response: {
        201: sessionResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repo = await app.services.get(RepoService).get({
        userId: user.sub,
        repoId: request.body.repoId,
      });

      const identityId = request.body.identityId ?? repo.defaultIdentityId;
      if (!identityId) {
        reply.code(400).send({ error: 'No identity specified and repo has no default identity' });
        return;
      }

      const branch = request.body.branch ?? repo.defaultBranch;
      if (!branch) {
        reply.code(400).send({ error: 'No branch specified and repo has no default branch' });
        return;
      }

      const session = await app.services.get(SessionService).create({
        userId: user.sub,
        identityId,
        repoUrl: repo.repoUrl,
        branch,
        prompt: request.body.prompt,
        repoId: repo.id,
      });

      // Fire-and-forget — SSE is the feedback channel
      startSession(app.services, session.id).catch(() => undefined);

      reply.code(201).send(session);
    },
  });

  typedApp.get('/sessions', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: sessionListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const sessions = await app.services.get(SessionService).list(user.sub);
      reply.send(sessions);
    },
  });

  typedApp.get('/sessions/:sessionId', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      response: {
        200: sessionResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });
      reply.send(session);
    },
  });

  typedApp.delete('/sessions/:sessionId', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
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

      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const agentService = app.services.get(AgentService);
      try {
        const provider = agentService.getProvider();
        await provider.abort(session.id);
      } catch {
        // Provider may not exist or session may not be running
      }

      await app.services.get(SessionService).delete({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      app.services.get(EventBusService).remove(session.id);

      reply.code(204).send();
    },
  });

  typedApp.post('/sessions/:sessionId/messages', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: sendMessageBodySchema,
      response: {
        200: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      await sendSessionMessage(app.services, session.id, request.body.message);

      reply.send({ error: '' });
    },
  });

  typedApp.post('/sessions/:sessionId/stop', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      response: {
        200: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      await stopSession(app.services, session.id);

      reply.send({ error: '' });
    },
  });

  typedApp.post('/sessions/:sessionId/interrupt', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      response: {
        200: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      await interruptSession(app.services, session.id);

      reply.send({ error: '' });
    },
  });

  typedApp.get('/sessions/:sessionId/messages', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      response: {
        200: messageListResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const messages = await app.services.get(MessageService).listBySession(session.id);
      reply.send(messages);
    },
  });

  typedApp.post('/sessions/:sessionId/revert', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: revertSessionBodySchema,
      response: {
        200: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      await revertSession(app.services, session.id, request.body.messageId);

      reply.send({ error: '' });
    },
  });

  typedApp.get('/sessions/:sessionId/events', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      querystring: z.object({
        after: z.coerce.number().int().optional(),
      }),
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      reply.hijack();

      await streamSessionEvents({
        reply,
        sessionId: session.id,
        eventBus: app.services.get(EventBusService),
        sessionEventService: app.services.get(SessionEventService),
        afterSequence: request.query.after,
      });
    },
  });
};

export { registerSessionRoutes };
