import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';

import type { Config } from '../config/config.js';
import type { Services } from '../container/container.js';
import { AuthService } from '../services/auth/auth.js';
import { AuthError, InvalidCredentialsError, InvalidTokenError } from '../services/auth/auth.errors.js';
import { AgentError } from '../services/agent/agent.errors.js';
import { GitError } from '../services/git/git.errors.js';
import {
  IdentityError,
  IdentityForbiddenError,
  IdentityNotFoundError,
} from '../services/identity/identity.errors.js';
import {
  RepoError,
  RepoForbiddenError,
  RepoNotFoundError,
} from '../services/repo/repo.errors.js';
import {
  SessionError,
  SessionForbiddenError,
  SessionNotFoundError,
} from '../services/session/session.errors.js';

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

    if (error instanceof InvalidCredentialsError || error instanceof InvalidTokenError) {
      reply.code(401).send({ error: error.message });
      return;
    }

    if (error instanceof AuthError) {
      reply.code(409).send({ error: error.message });
      return;
    }

    if (error instanceof IdentityNotFoundError) {
      reply.code(404).send({ error: error.message });
      return;
    }

    if (error instanceof IdentityForbiddenError) {
      reply.code(403).send({ error: error.message });
      return;
    }

    if (error instanceof IdentityError) {
      reply.code(400).send({ error: error.message });
      return;
    }

    if (error instanceof RepoNotFoundError) {
      reply.code(404).send({ error: error.message });
      return;
    }

    if (error instanceof RepoForbiddenError) {
      reply.code(403).send({ error: error.message });
      return;
    }

    if (error instanceof RepoError) {
      reply.code(400).send({ error: error.message });
      return;
    }

    if (error instanceof SessionNotFoundError) {
      reply.code(404).send({ error: error.message });
      return;
    }

    if (error instanceof SessionForbiddenError) {
      reply.code(403).send({ error: error.message });
      return;
    }

    if (error instanceof SessionError) {
      reply.code(400).send({ error: error.message });
      return;
    }

    if (error instanceof GitError) {
      reply.code(502).send({ error: error.message });
      return;
    }

    if (error instanceof AgentError) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
};

export type { CreateAppInput };
export { createApp };
