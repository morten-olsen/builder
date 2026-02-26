# Architecture

## Overview

This system is a **coding agent orchestrator** — a headless server that manages agentic coding sessions on top of existing coding agents (initially the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript)). Users authenticate, configure Git identities with SSH keypairs, and create sessions where a worktree is checked out and an agent works interactively until a task is complete.

The server exposes a full REST + SSE API, documented via OpenAPI. A generated client library enables any consumer — a bundled web frontend, a CLI, or another agentic system — to drive sessions programmatically.

## Monorepo Layout

```
packages/
  configs/          # Shared tsconfig, base configs
  server/           # Fastify API server (core of the system)
  client/           # Generated TypeScript client library (openapi-fetch + hand-written SSE)
  tests/            # Shared test utilities, workspace aliases

apps/
  web/              # Vite + React + TanStack Router + TanStack Query + Tailwind
```

## Core Domain Model

```
User
 ├── has many → Identity
 │                ├── SSH keypair (public + encrypted private key)
 │                ├── Git author name / email
 │                └── used for repo checkout & commit signing
 │
 └── has many → Session
                  ├── references an Identity
                  ├── repo URL + branch/ref
                  ├── managed worktree path on disk
                  ├── agent process (Claude Agent SDK)
                  ├── status: pending | running | waiting_for_input | completed | failed
                  └── conversation history (messages in/out)
```

### Key Entities

**User** — An authenticated account. Owns identities and sessions. Authenticates via email + password (local auth), receives JWT tokens.

**Identity** — A named Git identity belonging to a user. Holds an SSH keypair used to clone/push to repositories and a Git author name/email for commits. A user may have multiple identities (e.g. personal, work). Keys can be server-generated (Ed25519) or user-imported.

**Session** — A single agentic task execution. Created by a user referencing an identity and a repository. The server:
1. Clones / fetches the repo using the identity's SSH key
2. Creates a Git worktree for the session
3. Runs the Claude Agent SDK in-process, scoped to that worktree
4. Streams agent output and events to the client via SSE
5. Accepts user messages/approvals when the agent is waiting for input
6. On completion, the worktree can be inspected, a branch pushed, or cleaned up

## Dependency Injection

All services use the **service locator pattern** described in [Simple Service Pattern](https://mortenolsen.pro/posts/simple-service-pattern/). This is the one area where classes are used — the rest of the codebase follows the functional style from the coding standard.

```typescript
// Services are classes that receive the container
class GitService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  // Lazy access to other services
  get #db(): DatabaseService {
    return this.#services.get(DatabaseService);
  }
}

// Usage
const services = new Services();
const git = services.get(GitService);
```

The container provides:
- **Lazy instantiation** — services are created on first `.get()` call
- **Testability** — `.set()` to inject mocks without module patching
- **Graceful shutdown** — `[destroy]` symbol for cleanup (DB connections, child processes)

## Package Details

### `packages/server`

The headless API server — the core of the system.

**Stack:**
- [Fastify](https://fastify.dev/) with [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) for request/response validation
- [Zod](https://zod.dev/) schemas as the single source of truth for validation and types
- [@fastify/swagger](https://github.com/fastify/fastify-swagger) + `jsonSchemaTransform` for automatic OpenAPI spec generation
- [Kysely](https://kysely.dev/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for database access
- [@anthropic-ai/claude-agent-sdk](https://github.com/anthropics/claude-agent-sdk-typescript) for agent execution
- Service locator pattern for dependency injection

**Route structure:**

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /users/:userId/identities
POST   /users/:userId/identities
GET    /users/:userId/identities/:identityId
PUT    /users/:userId/identities/:identityId
DELETE /users/:userId/identities/:identityId

GET    /sessions
POST   /sessions
GET    /sessions/:sessionId
DELETE /sessions/:sessionId

POST   /sessions/:sessionId/messages      # send user message / approval
GET    /sessions/:sessionId/events         # SSE stream

GET    /openapi.json                        # generated spec
```

**Internal modules (following coding standard module pattern):**

```
server/src/
  exports.ts                    # Public API entrypoint
  app/
    app.ts                      # Fastify app factory (plugins, providers, routes)
  container/
    container.ts                # Services container implementation
  routes/
    auth/
      auth.ts                   # Auth route handlers
      auth.schemas.ts           # Zod schemas for auth routes
    identities/
      identities.ts
      identities.schemas.ts
    sessions/
      sessions.ts
      sessions.schemas.ts
  services/
    auth/
      auth.ts                   # Authentication service (password hashing, JWT)
    identity/
      identity.ts               # SSH keypair generation/import, storage, lookup
    git/
      git.ts                    # Clone, fetch, worktree create/remove, push
    session-manager/
      session-manager.ts        # Lifecycle: create, run, pause, resume, destroy
    agent/
      agent.ts                  # Claude Agent SDK wrapper (provider interface)
    database/
      database.ts               # Kysely + better-sqlite3 setup, migrations
      database.migrations.ts    # Migration definitions
  sse/
    event-bus/
      event-bus.ts              # Per-session event emitter
    stream/
      stream.ts                 # SSE serialization for Fastify
```

**SSE event types:**

| Event | Payload | Description |
|---|---|---|
| `agent:output` | `{ text, type }` | Streamed agent text/tool output |
| `agent:tool_use` | `{ tool, input }` | Agent is invoking a tool |
| `agent:tool_result` | `{ tool, output }` | Tool execution result |
| `session:status` | `{ status }` | Session status transition |
| `session:waiting_for_input` | `{ prompt, type }` | Agent needs user input/approval |
| `session:completed` | `{ summary }` | Task finished |
| `session:error` | `{ error }` | Unrecoverable error |

### `packages/client`

A TypeScript client library with two parts:

**1. Generated REST client** — Uses [openapi-typescript](https://openapi-ts.dev/introduction) to generate types from the server's `openapi.json`, paired with [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) for a minimal typed fetch wrapper.

**2. Hand-written SSE client** — Wraps `EventSource` / `fetch` with typed event discriminated unions matching the server's event schema. This part is not generated since SSE isn't part of OpenAPI.

**Build pipeline:** Server builds → exports OpenAPI spec → `openapi-typescript` generates types → `openapi-fetch` uses those types at runtime.

**Public API surface:**

```typescript
import { createClient } from '@morten-olsen/builder-client';

const client = createClient({ baseUrl: '...', token: '...' });

// Typed REST methods (generated from OpenAPI)
await client.POST('/auth/login', { body: { email, password } });
const { data } = await client.GET('/sessions/{sessionId}', { params: { path: { sessionId } } });

// SSE event stream (hand-written, typed)
const stream = client.events(sessionId);
stream.on('agent:output', (e) => { /* e is typed */ });
stream.on('session:waiting_for_input', (e) => { /* e is typed */ });
```

### `apps/web`

A Vite + React frontend. One possible consumer — the architecture explicitly supports replacement or parallel consumers.

**Stack:**
- [Vite](https://vite.dev/) for build/dev
- [React](https://react.dev/) for UI
- [TanStack Router](https://tanstack.com/router) for type-safe file-based routing
- [TanStack Query](https://tanstack.com/query) for server state (integrates with openapi-fetch)
- [Tailwind CSS](https://tailwindcss.com/) for styling

**Responsibilities:**
- Login / registration
- Identity management (generate or import SSH keys, set Git author)
- Session creation (pick identity, repo, branch, describe task)
- Live session view: streaming agent output, tool calls, user input prompts
- Session history and status overview

**Non-goals:**
- No business logic — all orchestration is server-side
- Communicates exclusively through the generated client library

## Authentication

Local email + password authentication. Passwords hashed with scrypt (Node.js `node:crypto`). Server issues short-lived JWT access tokens + longer-lived refresh tokens.

The auth service is behind the service locator, so swapping to OAuth/OIDC or API keys later requires only a new service implementation.

## Git & Worktree Management

Each session gets an isolated worktree:

```
<data-dir>/
  repos/
    <repo-hash>/              # bare clone (shared across sessions)
  worktrees/
    <session-id>/             # git worktree for this session
```

1. On session creation, the server ensures a bare clone of the repo exists (cloned via the identity's SSH key)
2. A worktree is created from the requested ref: `git worktree add <path> <ref>`
3. The agent operates inside the worktree directory
4. On completion, the server can push the worktree branch, create a PR, or clean up

SSH key usage is handled via `GIT_SSH_COMMAND` with a per-session temporary key file, scoped so keys are never shared across sessions.

### SSH Key Management

Identities support two modes:
- **Server-generated**: Ed25519 keypair created on identity creation. User retrieves the public key to add to their Git host.
- **User-imported**: User provides an existing keypair. Server stores it encrypted.

Private keys are encrypted at rest using AES-256-GCM with a server-managed encryption key.

## Agent Integration

The agent service supports **multiple agent providers** via a provider registry. Each session can specify which provider to use (or fall back to the global default). Currently supported providers:

- **Claude** (`claude`) — wraps the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript), running in-process
- **OpenCode** (`opencode`) — wraps the [OpenCode SDK](https://opencode.ai/docs/sdk/), starting a local OpenCode server

### Provider interface

Providers implement the `AgentProvider` interface: `run`, `sendMessage`, `stop`, `abort`, `isRunning`, and optionally declare `models` (used by the `/api/models` endpoint).

### Per-session provider selection

Sessions have an optional `provider` column. When set, the session uses that provider; otherwise the global `AGENT_PROVIDER` config default is used. The API endpoints `GET /api/providers` and `GET /api/models` (with a `provider` field per model) allow clients to discover available providers and their models.

### Lifecycle

1. Initializes a headless agent session scoped to the worktree directory
2. Pipes the user's initial prompt as the task description
3. Streams all agent output through the session's event bus
4. When the agent requires user input (e.g. tool approval, clarification), emits a `session:waiting_for_input` event and pauses
5. Resumes on receiving a user message via `POST /sessions/:id/messages`
6. On completion, captures the final state and emits `session:completed`

The provider interface supports:
- Plugging in new agent backends without modifying the rest of the system
- Migration to child-process or container isolation per provider

## Data Storage

**Database:** SQLite via [Kysely](https://kysely.dev/) query builder + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) driver.

**Stored in the database:**
- Users (email, password hash)
- Identities (name, Git author, encrypted SSH keys, foreign key to user)
- Sessions (metadata, status, repo URL, ref, foreign keys to user + identity)

**Stored on disk:**
- Conversation history: append-only JSON files per session under `<data-dir>/conversations/<session-id>.json`
- Git repos and worktrees under `<data-dir>/repos/` and `<data-dir>/worktrees/`

This keeps the database lean and conversation replay straightforward.

## Build & Dev Workflow

- **pnpm** workspaces with **Turborepo** for task orchestration
- `turbo build` compiles all packages (TypeScript → `dist/`)
- Client generation runs as a build step: server builds → exports OpenAPI spec → `openapi-typescript` generates types
- `turbo dev` runs server in watch mode + Vite dev server for the frontend
- `vitest` for unit/integration tests across all packages

## Security Considerations

- SSH private keys encrypted at rest (AES-256-GCM)
- Passwords hashed with scrypt
- Worktrees isolated per session; agents cannot access other sessions' directories
- Agent execution scoped to worktree directory
- JWT tokens short-lived; refresh tokens for long-lived web sessions
- All inputs validated at the boundary via Zod schemas
- Rate limiting on session creation to prevent resource exhaustion

## Future Considerations

- **Child process isolation**: move agent execution out-of-process for better isolation
- **Container isolation**: run each agent in a sandboxed container
- **Webhooks**: notify external systems on session events
- **Queue-based session execution**: for scaling beyond single-server
- **Collaborative sessions**: multiple users observing/interacting with one session
- **PR integration**: auto-create PRs on session completion, link to GitHub/GitLab
- **OAuth/OIDC**: replace local auth with external identity providers
