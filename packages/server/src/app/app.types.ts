import type { FastifyReply, FastifyRequest as FastifyReq } from 'fastify';

import type { Config } from '../config/config.js';
import type { Services } from '../container/container.js';
import type { AuthTokenPayload } from '../services/auth/auth.js';

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyRequest {
    user: AuthTokenPayload | null;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyInstance {
    services: Services;
    config: Config;
    authenticate: (request: FastifyReq, reply: FastifyReply) => Promise<void>;
  }
}
