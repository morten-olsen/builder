import type { FastifyInstance } from 'fastify';

import { handleWebSocket } from '../../ws/ws.js';

const registerWsRoutes = (app: FastifyInstance): void => {
  app.get('/api/ws', { websocket: true }, (socket) => {
    handleWebSocket({ socket, services: app.services });
  });
};

export { registerWsRoutes };
