import { fastify } from 'fastify';
import { fastifySwagger } from '@fastify/swagger';
import { fastifySwaggerUi } from '@fastify/swagger-ui';
import fastifyWebSocket from '@fastify/websocket';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';

import type { Config } from '../config/config.js';
import type { Services } from '../container/container.js';
import { AuthService } from '../services/auth/auth.js';
import { AppError } from '../errors/errors.js';

import './app.types.js';

type CreateAppInput = {
  services: Services;
  config: Config;
};

const createApp = async (input: CreateAppInput) => {
  const app = fastify();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Builder API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  });

  await app.register(fastifyWebSocket);

  app.decorate('services', input.services);
  app.decorate('config', input.config);

  app.decorateRequest('user', null);

  app.decorate('authenticate', async (request: { user: unknown; headers: { authorization?: string } }, reply: { code: (code: number) => { send: (body: unknown) => void } }) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const token = header.slice(7);
    try {
      const payload = await input.services.get(AuthService).verifyToken(token);
      request.user = payload;
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.code(400).send({
        error: 'Validation error',
        details: error.validation,
      });
      return;
    }

    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.message });
      return;
    }

    console.error('Unhandled error:', error);
    reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
};

export type { CreateAppInput };
export { createApp };
