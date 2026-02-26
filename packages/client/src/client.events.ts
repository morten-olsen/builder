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

type WsTerminalOutputMessage = {
  kind: 'terminal:output';
  sessionId: string;
  terminalId: string;
  data: string;
};

type WsTerminalExitMessage = {
  kind: 'terminal:exit';
  sessionId: string;
  terminalId: string;
  exitCode: number;
};

type WsServerMessage = WsSessionEventMessage | WsUserEventMessage | WsSyncMessage | WsAuthOkMessage | WsTerminalOutputMessage | WsTerminalExitMessage;

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

type WsTerminalSubscribeMessage = {
  type: 'terminal:subscribe';
  sessionId: string;
  terminalId: string;
};

type WsTerminalUnsubscribeMessage = {
  type: 'terminal:unsubscribe';
  sessionId: string;
  terminalId: string;
};

type WsTerminalInputMessage = {
  type: 'terminal:input';
  sessionId: string;
  terminalId: string;
  data: string;
};

type WsTerminalResizeMessage = {
  type: 'terminal:resize';
  sessionId: string;
  terminalId: string;
  cols: number;
  rows: number;
};

type WsClientMessage = WsAuthMessage | WsSubscribeMessage | WsUnsubscribeMessage | WsTerminalSubscribeMessage | WsTerminalUnsubscribeMessage | WsTerminalInputMessage | WsTerminalResizeMessage;

export type {
  SessionEvent,
  UserEvent,
  WsServerMessage,
  WsSessionEventMessage,
  WsUserEventMessage,
  WsSyncMessage,
  WsAuthOkMessage,
  WsTerminalOutputMessage,
  WsTerminalExitMessage,
  WsClientMessage,
  WsAuthMessage,
  WsSubscribeMessage,
  WsUnsubscribeMessage,
  WsTerminalSubscribeMessage,
  WsTerminalUnsubscribeMessage,
  WsTerminalInputMessage,
  WsTerminalResizeMessage,
};
