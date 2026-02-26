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

type AnthropicModel = {
  id: string;
  display_name: string;
  created_at: string;
  type: string;
};

type AnthropicModelsResponse = {
  data: AnthropicModel[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
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

      const apiKey = app.services.config.agent.apiKey;
      const models: AnthropicModel[] = [];
      let afterId: string | undefined;

      do {
        const url = new URL('https://api.anthropic.com/v1/models');
        url.searchParams.set('limit', '1000');
        if (afterId) {
          url.searchParams.set('after_id', afterId);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const body = (await response.json()) as AnthropicModelsResponse;
        models.push(...body.data);

        if (body.has_more && body.last_id) {
          afterId = body.last_id;
        } else {
          break;
        }
      } while (true);

      const result = models.map((m) => ({
        id: m.id,
        displayName: m.display_name,
        createdAt: m.created_at,
      }));

      reply.send(result);
    },
  });
};

export { registerModelRoutes };
