import type { FastifyReply } from 'fastify';

import type { SessionRef } from '../services/session/session.js';
import type { SessionEventService } from '../services/session-event/session-event.js';

import type { EventBusService, SessionEvent, UserEvent } from './event-bus.js';

type StreamSessionEventsInput = {
  reply: FastifyReply;
  ref: SessionRef;
  eventBus: EventBusService;
  sessionEventService: SessionEventService;
  afterSequence?: number;
};

type StreamUserEventsInput = {
  reply: FastifyReply;
  userId: string;
  eventBus: EventBusService;
};

const writeEvent = (reply: FastifyReply, event: SessionEvent, sequence: number): void => {
  reply.raw.write(`id: ${sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
};

const streamSessionEvents = async (input: StreamSessionEventsInput): Promise<void> => {
  const { reply, ref, eventBus, sessionEventService, afterSequence } = input;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // 1. Subscribe to live events — buffer them until history replay is done
  const buffer: { event: SessionEvent; sequence: number }[] = [];
  let replayed = false;

  const unsubscribe = eventBus.subscribe(ref, (event, sequence) => {
    if (replayed) {
      writeEvent(reply, event, sequence);
    } else {
      buffer.push({ event, sequence });
    }
  });

  reply.raw.on('close', () => {
    unsubscribe();
  });

  // 2. Replay historical events from DB
  const historical = await sessionEventService.listBySession({
    ref,
    afterSequence,
  });

  let lastSequence = afterSequence ?? 0;

  for (const row of historical) {
    const event = { type: row.type, data: row.data } as SessionEvent;
    writeEvent(reply, event, row.sequence);
    lastSequence = row.sequence;
  }

  // 3. Send sync marker
  reply.raw.write(`event: sync\ndata: ${JSON.stringify({ lastSequence })}\n\n`);

  // 4. Flush buffered live events (skip duplicates)
  replayed = true;
  for (const item of buffer) {
    if (item.sequence > lastSequence) {
      writeEvent(reply, item.event, item.sequence);
      lastSequence = item.sequence;
    }
  }
  buffer.length = 0;
};

const writeUserEvent = (reply: FastifyReply, event: UserEvent): void => {
  reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
};

const streamUserEvents = async (input: StreamUserEventsInput): Promise<void> => {
  const { reply, userId, eventBus } = input;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const unsubscribe = eventBus.subscribeUser(userId, (event) => {
    writeUserEvent(reply, event);
  });

  reply.raw.on('close', () => {
    unsubscribe();
  });
};

export type { StreamSessionEventsInput, StreamUserEventsInput };
export { streamSessionEvents, streamUserEvents };
