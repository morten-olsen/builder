type SessionEvent =
  | { type: 'agent:output'; data: { text: string; messageType: string } }
  | { type: 'agent:tool_use'; data: { tool: string; input: unknown } }
  | { type: 'agent:tool_result'; data: { tool: string; output: unknown } }
  | { type: 'user:message'; data: { message: string } }
  | { type: 'session:status'; data: { status: string } }
  | { type: 'session:waiting_for_input'; data: { prompt: string } }
  | { type: 'session:completed'; data: { summary: string } }
  | { type: 'session:error'; data: { error: string } }
  | { type: 'session:snapshot'; data: { messageId: string; commitSha: string } }
  | { type: 'sync'; data: { lastSequence: number } };

type UserEvent = { type: 'session:updated'; data: { sessionId: string; status: string } };

type WsSessionEventMessage = {
  kind: 'session:event';
  sessionId: string;
  event: SessionEvent;
  sequence: number;
};

type WsUserEventMessage = {
  kind: 'user:event';
  event: UserEvent;
};

type WsSyncMessage = {
  kind: 'sync';
  sessionId: string;
  lastSequence: number;
};

type WsAuthOkMessage = {
  kind: 'auth:ok';
};

type WsServerMessage = WsSessionEventMessage | WsUserEventMessage | WsSyncMessage | WsAuthOkMessage;

type WsAuthMessage = {
  type: 'auth';
  token: string;
};

type WsSubscribeMessage = {
  type: 'subscribe';
  sessionId: string;
  afterSequence?: number;
};

type WsUnsubscribeMessage = {
  type: 'unsubscribe';
  sessionId: string;
};

type WsClientMessage = WsAuthMessage | WsSubscribeMessage | WsUnsubscribeMessage;

export type {
  SessionEvent,
  UserEvent,
  WsServerMessage,
  WsSessionEventMessage,
  WsUserEventMessage,
  WsSyncMessage,
  WsAuthOkMessage,
  WsClientMessage,
  WsAuthMessage,
  WsSubscribeMessage,
  WsUnsubscribeMessage,
};
