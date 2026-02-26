import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { AgentService } from '../../services/agent/agent.js';
import { RepoService } from '../../services/repo/repo.js';
import { sessionRef, SessionService, sessionKey } from '../../services/session/session.js';
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
  pinSessionBodySchema,
  updateModelBodySchema,
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

  typedApp.post('/api/sessions', {
    onRequest: [app.authenticate],
    schema: {
      body: createSessionBodySchema,
      response: {
        201: sessionResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        409: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const repo = await app.services.get(RepoService).get({
        userId: user.sub,
        repoId: request.body.repoId,
      });

      if (!repo.repoUrl) {
        reply.code(400).send({ error: 'No repository URL configured for this repo' });
        return;
      }

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
        id: request.body.id,
        userId: user.sub,
        repoId: repo.id,
        identityId,
        repoUrl: repo.repoUrl,
        branch,
        prompt: request.body.prompt,
        model: request.body.model,
        provider: request.body.provider,
      });

      const ref = sessionRef(session);

      // Fire-and-forget — SSE is the feedback channel
      startSession(app.services, ref).catch(() => undefined);

      reply.code(201).send(session);
    },
  });

  typedApp.get('/api/sessions', {
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

  typedApp.get('/api/sessions/:sessionId', {
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

  typedApp.delete('/api/sessions/:sessionId', {
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
      const ref = sessionRef(session);
      const key = sessionKey(ref);

      const agentService = app.services.get(AgentService);
      try {
        const provider = agentService.getProvider(session.provider ?? undefined);
        await provider.abort(key);
      } catch {
        // Provider may not exist or session may not be running
      }

      await app.services.get(SessionService).delete(ref);

      app.services.get(EventBusService).remove(ref);

      reply.code(204).send();
    },
  });

  typedApp.post('/api/sessions/:sessionId/messages', {
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

      await sendSessionMessage(app.services, sessionRef(session), request.body.message);

      reply.send({ error: '' });
    },
  });

  typedApp.post('/api/sessions/:sessionId/stop', {
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

      await stopSession(app.services, sessionRef(session));

      reply.send({ error: '' });
    },
  });

  typedApp.post('/api/sessions/:sessionId/interrupt', {
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

      await interruptSession(app.services, sessionRef(session));

      reply.send({ error: '' });
    },
  });

  typedApp.get('/api/sessions/:sessionId/messages', {
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

      const messages = await app.services.get(MessageService).listBySession(sessionRef(session));
      reply.send(messages);
    },
  });

  typedApp.post('/api/sessions/:sessionId/revert', {
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

      await revertSession(app.services, sessionRef(session), request.body.messageId);

      reply.send({ error: '' });
    },
  });

  typedApp.put('/api/sessions/:sessionId/pin', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: pinSessionBodySchema,
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
      const sessionService = app.services.get(SessionService);

      // Get the session to build the ref
      const session = await sessionService.get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });
      const ref = sessionRef(session);

      if (request.body.pinned) {
        await sessionService.pin(ref);
      } else {
        await sessionService.unpin(ref);
      }

      const updated = await sessionService.getByRef(ref);
      reply.send(updated);
    },
  });

  typedApp.put('/api/sessions/:sessionId/model', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: updateModelBodySchema,
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
      const sessionService = app.services.get(SessionService);

      const session = await sessionService.get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });
      const ref = sessionRef(session);

      await sessionService.updateModel(ref, request.body.model);

      const updated = await sessionService.getByRef(ref);
      reply.send(updated);
    },
  });

  typedApp.get('/api/sessions/:sessionId/events', {
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
      const ref = sessionRef(session);

      reply.hijack();

      await streamSessionEvents({
        reply,
        ref,
        eventBus: app.services.get(EventBusService),
        sessionEventService: app.services.get(SessionEventService),
        afterSequence: request.query.after,
      });
    },
  });
};

export { registerSessionRoutes };
