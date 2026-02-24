type SessionEvent =
  | { type: 'agent:output'; data: { text: string; messageType: string } }
  | { type: 'agent:tool_use'; data: { tool: string; input: unknown } }
  | { type: 'agent:tool_result'; data: { tool: string; output: unknown } }
  | { type: 'session:status'; data: { status: string } }
  | { type: 'session:waiting_for_input'; data: { prompt: string } }
  | { type: 'session:completed'; data: { summary: string } }
  | { type: 'session:error'; data: { error: string } }
  | { type: 'session:snapshot'; data: { messageId: string; commitSha: string } }
  | { type: 'sync'; data: { lastSequence: number } };

type UserEvent = { type: 'session:updated'; data: { sessionId: string; status: string } };

export type { SessionEvent, UserEvent };
