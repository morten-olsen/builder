import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { sessionRef, SessionService } from '../../services/session/session.js';
import { TerminalService } from '../../services/terminal/terminal.js';

import {
  terminalParamsSchema,
  sessionParamsOnlySchema,
  createTerminalBodySchema,
  resizeTerminalBodySchema,
  terminalInfoResponseSchema,
  terminalListResponseSchema,
  errorResponseSchema,
} from './terminals.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerTerminalRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/api/sessions/:sessionId/terminals', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsOnlySchema,
      body: createTerminalBodySchema,
      response: {
        201: terminalInfoResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
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

      const info = await app.services.get(TerminalService).create(
        ref,
        request.body.id,
        request.body.cols,
        request.body.rows,
      );

      reply.code(201).send(info);
    },
  });

  typedApp.get('/api/sessions/:sessionId/terminals', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsOnlySchema,
      response: {
        200: terminalListResponseSchema,
        401: errorResponseSchema,
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

      const terminals = app.services.get(TerminalService).list(ref);
      reply.send(terminals);
    },
  });

  typedApp.get('/api/sessions/:sessionId/terminals/:terminalId', {
    onRequest: [app.authenticate],
    schema: {
      params: terminalParamsSchema,
      response: {
        200: terminalInfoResponseSchema,
        401: errorResponseSchema,
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

      const info = app.services.get(TerminalService).get(ref, request.params.terminalId);
      if (!info) {
        reply.code(404).send({ error: 'Terminal not found' });
        return;
      }

      reply.send(info);
    },
  });

  typedApp.post('/api/sessions/:sessionId/terminals/:terminalId/resize', {
    onRequest: [app.authenticate],
    schema: {
      params: terminalParamsSchema,
      body: resizeTerminalBodySchema,
      response: {
        200: z.undefined().describe('OK'),
        401: errorResponseSchema,
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

      app.services.get(TerminalService).resize(
        ref,
        request.params.terminalId,
        request.body.cols,
        request.body.rows,
      );

      reply.code(200).send();
    },
  });

  typedApp.delete('/api/sessions/:sessionId/terminals/:terminalId', {
    onRequest: [app.authenticate],
    schema: {
      params: terminalParamsSchema,
      response: {
        204: z.undefined().describe('No content'),
        401: errorResponseSchema,
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

      app.services.get(TerminalService).kill(ref, request.params.terminalId);
      reply.code(204).send();
    },
  });
};

export { registerTerminalRoutes };
