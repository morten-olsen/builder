# API Guide

Builder exposes a REST + SSE API. Interactive documentation (Swagger UI) is available at `/documentation` on a running server, and the raw OpenAPI spec at `/openapi.json`.

This guide covers authentication, making requests, and the SSE event stream. For the full list of endpoints and their schemas, see the interactive docs.

## Authentication

The API uses JWT bearer tokens. Obtain a token by logging in:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

Response:

```json
{
  "token": "eyJhbG...",
  "user": { "id": "...", "email": "you@example.com" }
}
```

Include the token in all subsequent requests:

```http
Authorization: Bearer eyJhbG...
```

Tokens expire after 24 hours by default (configurable via `JWT_EXPIRES_IN`).

To create an account programmatically, use `POST /auth/register` with the same body shape.

## Making Requests

All request and response bodies are JSON. The API validates inputs with Zod schemas — invalid requests return a `400` with validation details:

```json
{
  "error": "Validation error",
  "details": [...]
}
```

Standard HTTP status codes are used throughout:

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Validation error or bad request |
| `401` | Missing or invalid token |
| `403` | Forbidden (resource belongs to another user) |
| `404` | Resource not found |
| `500` | Internal server error |

## SSE Event Streams

### Session events

Subscribe to a session's event stream:

```http
GET /sessions/:sessionId/events
Authorization: Bearer eyJhbG...
Accept: text/event-stream
```

The stream uses standard [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) format:

```
id: 1
event: agent:output
data: {"text":"Looking at the codebase...","messageType":"text"}

id: 2
event: agent:tool_use
data: {"tool":"Read","input":{"file_path":"src/index.ts"}}
```

Each event has a numeric `id` (sequence number) that increments per session. You can resume from a specific point by passing `?after=<sequence>`:

```http
GET /sessions/:sessionId/events?after=42
```

The server replays all events after the given sequence, then sends a `sync` marker before continuing with live events:

```
event: sync
data: {"lastSequence":57}
```

#### Event types

| Event | Data | Description |
|---|---|---|
| `agent:output` | `{ text, messageType }` | Streamed agent text output |
| `agent:tool_use` | `{ tool, input }` | Agent is invoking a tool |
| `agent:tool_result` | `{ tool, output }` | Tool execution result |
| `session:status` | `{ status }` | Session status changed (`running`, `idle`, `completed`, `failed`) |
| `session:waiting_for_input` | `{ prompt }` | Agent needs user input |
| `session:completed` | `{ summary }` | Task finished |
| `session:error` | `{ error }` | Unrecoverable error |
| `session:snapshot` | `{ messageId, commitSha }` | Checkpoint snapshot taken |
| `sync` | `{ lastSequence }` | History replay complete, live events follow |

### User events

Subscribe to account-level events (e.g. session status changes across all your sessions):

```http
GET /events
Authorization: Bearer eyJhbG...
Accept: text/event-stream
```

| Event | Data | Description |
|---|---|---|
| `session:updated` | `{ sessionId, status }` | One of your sessions changed status |

## TypeScript Client

A generated client library is published as `@morten-olsen/builder-client`:

```sh
npm install @morten-olsen/builder-client
```

```typescript
import { createBuilderClient } from '@morten-olsen/builder-client';

const client = createBuilderClient({
  baseUrl: 'http://localhost:3000',
  token: '...',
});

// Typed REST calls (generated from OpenAPI)
const { data } = await client.api.POST('/sessions', {
  body: { identityId, repoUrl, branch, prompt: 'Fix the login bug' },
});

// Stream session events
await client.streamEvents(data.id, (event) => {
  switch (event.type) {
    case 'agent:output':
      process.stdout.write(event.data.text);
      break;
    case 'session:completed':
      console.log('Done:', event.data.summary);
      break;
  }
});

// Resume from a sequence number
await client.streamEvents(
  data.id,
  (event) => { /* ... */ },
  { afterSequence: 42 },
);

// Stream until a condition is met
await client.streamEvents(
  data.id,
  (event) => { /* ... */ },
  (event) => event.type === 'session:completed',
);

// User-level events
const abort = new AbortController();
await client.streamUserEvents(
  (event) => console.log(event.data.sessionId, event.data.status),
  { signal: abort.signal },
);
```

The client handles auth headers automatically. Call `client.setToken(newToken)` to update the token after re-authentication.
