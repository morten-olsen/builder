import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { DatabaseService } from '../../services/database/database.js';
import { NotificationService } from '../../services/notification/notification.js';
import { SessionService } from '../../services/session/session.js';

import {
  channelParamsSchema,
  createChannelBodySchema,
  updateChannelBodySchema,
  channelResponseSchema,
  channelListResponseSchema,
  providerListResponseSchema,
  preferencesResponseSchema,
  updatePreferencesBodySchema,
  sessionNotificationBodySchema,
  errorResponseSchema,
  successResponseSchema,
} from './notifications.schemas.js';
import { sessionParamsSchema } from '../sessions/sessions.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerNotificationRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List available providers
  typedApp.get('/api/notification-channels/providers', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: providerListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      requireUser(request.user, reply);
      const names = app.services.get(NotificationService).getProviderNames();
      reply.send(names);
    },
  });

  // Create channel
  typedApp.post('/api/notification-channels', {
    onRequest: [app.authenticate],
    schema: {
      body: createChannelBodySchema,
      response: {
        201: channelResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const channel = await app.services.get(NotificationService).create({
        userId: user.sub,
        name: request.body.name,
        provider: request.body.provider,
        config: request.body.config,
      });
      reply.code(201).send(channel);
    },
  });

  // List user's channels
  typedApp.get('/api/notification-channels', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: channelListResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const channels = await app.services.get(NotificationService).list(user.sub);
      reply.send(channels);
    },
  });

  // Get channel
  typedApp.get('/api/notification-channels/:channelId', {
    onRequest: [app.authenticate],
    schema: {
      params: channelParamsSchema,
      response: {
        200: channelResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const channel = await app.services.get(NotificationService).get({
        userId: user.sub,
        channelId: request.params.channelId,
      });
      reply.send(channel);
    },
  });

  // Update channel
  typedApp.put('/api/notification-channels/:channelId', {
    onRequest: [app.authenticate],
    schema: {
      params: channelParamsSchema,
      body: updateChannelBodySchema,
      response: {
        200: channelResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const channel = await app.services.get(NotificationService).update({
        userId: user.sub,
        channelId: request.params.channelId,
        ...request.body,
      });
      reply.send(channel);
    },
  });

  // Delete channel
  typedApp.delete('/api/notification-channels/:channelId', {
    onRequest: [app.authenticate],
    schema: {
      params: channelParamsSchema,
      response: {
        204: z.undefined().describe('No content'),
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      await app.services.get(NotificationService).delete({
        userId: user.sub,
        channelId: request.params.channelId,
      });
      reply.code(204).send();
    },
  });

  // Test channel
  typedApp.post('/api/notification-channels/:channelId/test', {
    onRequest: [app.authenticate],
    schema: {
      params: channelParamsSchema,
      response: {
        200: successResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      await app.services.get(NotificationService).test({
        userId: user.sub,
        channelId: request.params.channelId,
      });
      reply.send({ success: true });
    },
  });

  // Get notification preferences
  typedApp.get('/api/notification-preferences', {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: preferencesResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const prefs = await app.services.get(NotificationService).getPreferences(user.sub);
      reply.send(prefs);
    },
  });

  // Update notification preferences
  typedApp.put('/api/notification-preferences', {
    onRequest: [app.authenticate],
    schema: {
      body: updatePreferencesBodySchema,
      response: {
        200: preferencesResponseSchema,
        401: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const prefs = await app.services.get(NotificationService).updatePreferences({
        userId: user.sub,
        ...request.body,
      });
      reply.send(prefs);
    },
  });

  // Per-session notification toggle
  typedApp.put('/api/sessions/:sessionId/notifications', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: sessionNotificationBodySchema,
      response: {
        200: successResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const sessionService = app.services.get(SessionService);

      // Verify ownership
      await sessionService.get({ userId: user.sub, sessionId: request.params.sessionId });

      const db = await app.services.get(DatabaseService).getInstance();

      const value = request.body.enabled;

      await db
        .updateTable('sessions')
        .set({ notifications_enabled: value === null ? null : value ? 1 : 0 })
        .where('id', '=', request.params.sessionId)
        .execute();

      reply.send({ success: true });
    },
  });
};

export { registerNotificationRoutes };
