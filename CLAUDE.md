# CLAUDE.md

## Project

Coding agent orchestrator — headless server managing agentic coding sessions on top of the Claude Agent SDK. See [docs/architecture.md](docs/architecture.md) for full system design.

## Key Documentation

- [docs/architecture.md](docs/architecture.md) — System architecture, domain model, package layout, tech decisions
- [docs/coding-standard.md](docs/coding-standard.md) — Full TypeScript coding standard with examples

**Documentation policy:** Keep docs up to date. When you change behavior documented in the above files, update the docs in the same change. If you discover a discrepancy between docs and code, fix it. If you spend significant effort understanding something non-obvious, document it — add a section to the relevant doc or create a new file under `docs/` and link it here.

## Monorepo Structure

```
packages/server     # Fastify API server (@morten-olsen/builder-server)
packages/client     # Generated TS client library (@morten-olsen/builder-client)
packages/configs    # Shared tsconfig (@morten-olsen/builder-configs)
packages/tests      # Shared test utils (@morten-olsen/builder-tests)
apps/web            # Vite + React frontend
```

**Tooling:** pnpm workspaces, Turborepo, TypeScript 5.9, ESM (`"type": "module"`)

## Coding Standard (Quick Reference)

### Types & Functions
- **`type` over `interface`** — always
- **Arrow functions** — always (`const fn = (): ReturnType => { ... }`)
- **Explicit return types** — always annotate
- **Object params** for 3+ args — `const create = (input: CreateInput): Result => { ... }`

### Exports & Imports
- **Consolidated exports at end of file** — `export type { ... }; export { ... };`
- **No default exports**
- **`.js` extensions** in all imports — `import { foo } from './foo.js';`
- **Import order** — external, then internal, then relative (enforced by eslint)

### Schemas
- **Zod for all validation** — schema: `fooSchema` (camelCase + Schema), type: `Foo` (PascalCase) via `z.infer<>`

### Module Structure
- `{module}/{module}.ts` as public API, support files as `{module}/{module}.{area}.ts`
- **No index.ts files**
- **Kebab-case** for file names
- Consumers import from the main module file, not support files
- Split when file exceeds ~300-400 lines

### Classes
- **Prefer functions over classes** — exception: services (see DI below)
- **`#` for private fields** — never use `private` keyword
- **Arrow syntax for methods** — `get = async (id: string): Promise<T> => { ... }`
- **Getters/setters** for public access to private fields
- **Extract to utils** — only methods that use `this` belong on the class
- Class structure order: private fields → constructor → getters/setters → private methods → public methods

### Error Handling
- Throw specific error classes, let consumers handle
- `async/await` over `.then()` chains
- `unknown` over `any` — always

## Dependency Injection

Service locator pattern from [mortenolsen.pro/posts/simple-service-pattern](https://mortenolsen.pro/posts/simple-service-pattern/). Services are classes receiving the `Services` container — the one exception to "prefer functions over classes".

```typescript
class MyService {
  #services: Services;
  constructor(services: Services) { this.#services = services; }
  get #otherService(): OtherService { return this.#services.get(OtherService); }
}
```

- Lazy instantiation via `.get(ServiceClass)`
- Test mocking via `.set(ServiceClass, mock)`
- Cleanup via `[destroy]` symbol

## Tech Stack

| Layer | Choice |
|---|---|
| Server framework | Fastify + fastify-type-provider-zod |
| Validation | Zod (source of truth for types + OpenAPI) |
| Database | SQLite via Kysely + better-sqlite3 |
| Auth | Local email/password, JWT (scrypt for hashing) |
| Agent | Claude Agent SDK (in-process, provider interface) |
| Client codegen | openapi-typescript + openapi-fetch |
| Frontend | Vite + React + TanStack Router + TanStack Query + Tailwind |

## Frontend Routing

TanStack Router file-based routing: when a route has child routes, the parent file **must** render `<Outlet />` and page content goes in a separate `.index.tsx` file (e.g. `repos.tsx` = layout with Outlet, `repos.index.tsx` = list page, `repos.$repoId.tsx` = detail page).
| Testing | Vitest |
