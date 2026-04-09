---
name: dynamic-imports
description: Dynamic imports in TanStack Start server functions for Cloudflare Workers bundle size optimization. Use when writing server functions or application layer code.
core_ref: agents-platform
core_version: 2026-03-03
overlay_mode: append
---

# Dynamic Imports

the application requires selective dynamic imports in server functions for Cloudflare Workers compatibility. This skill explains where dynamic imports are mandatory, where static imports are preferred, and why.

## The Problem

Cloudflare Workers doesn't support `process.env` at module load time. Runtime bindings are available via `cloudflare:workers`, and must be accessed during request handling.

This repo also uses **Hyperdrive** for Postgres connection pooling + transaction support. The connection string is only reliably available at runtime in Workers.

```typescript
// ❌ This fails on Cloudflare Workers
// The import runs at module load time, before env is available
import { db } from '~/lib/db'

export const fn = createServerFn().handler(async () => {
  return db.selectFrom('users').execute() // db is undefined or throws
})
```

## The Solution

Use dynamic imports inside the handler function:

```typescript
// ✅ This works on Cloudflare Workers
export const fn = createServerFn().handler(async () => {
  const { getDb } = await import('~/lib/db')
  const db = await getDb()
  return db.selectFrom('users').execute()
})
```

## Import Strategy (Explicit Rule)

Use this matrix when deciding between static and dynamic imports:

| Module type                                                                                                          | Import style              | Rule          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------- |
| `~/lib/db` (or any module that initializes DB/env bindings)                                                          | Dynamic in request path   | **MANDATORY** |
| Modules that rely on runtime Worker bindings (`cloudflare:workers`) at request time                                  | Dynamic                   | **MANDATORY** |
| Feature-local orchestration/logic modules (`./application.server`, `./repository.server`, `./validation`, `./types`) | Static                    | **PREFERRED** |
| Auth middleware/helpers that do not require runtime binding initialization at module load                            | Static (dynamic optional) | **PREFERRED** |

Overusing dynamic imports for local feature modules is an anti-pattern in this codebase.

## The `getDb()` Function

The canonical implementation is `app/lib/db/index.ts`.

`getDb()`:

- Resolves a connection string from (in order):
  1. `process.env.DATABASE_URL` (Node/Bun: scripts, migrations, tests)
  2. Hyperdrive binding (`env.HYPERDRIVE.connectionString`) in Workers
  3. `env.DATABASE_URL` in Workers (wrangler dev fallback)
- Creates a lazy singleton `Kysely<Database>` using `PostgresDialect`.
- Uses a lightweight pool adapter in Workers to avoid “Worker hung” issues.

## When to Use Dynamic Imports

### Server Functions (Runtime-Sensitive Modules)

```typescript
import { batchSchema } from './validation'
import { insertBatch } from './repository.server'

export const createBatchFn = createServerFn({ method: 'POST' })
  .inputValidator(schema)
  .handler(async ({ data }) => {
    // Static imports for local feature modules are preferred
    batchSchema.parse(data)

    // Dynamic import is mandatory for db/runtime-sensitive modules
    const { getDb } = await import('~/lib/db')
    const db = await getDb()

    return insertBatch(db, data)
  })
```

### CLI Scripts (NOT NEEDED)

For seeders, migrations, and CLI scripts running in Node.js/Bun, use static imports:

```typescript
// seeders/production.ts - runs in Node.js/Bun
import { db } from '~/lib/db'

await db.insertInto('users').values({...}).execute()
```

## Common Patterns

### Auth Middleware (Optional Dynamic)

```typescript
const { requireAuth } = await import('../auth/server-middleware')
const session = await requireAuth()
```

### Farm Access Check

```typescript
const { assertFarmAccess } = await import('~/features/shared/auth/access')
await assertFarmAccess({ userId, farmId })
```

### Database Operations

```typescript
const { getDb } = await import('~/lib/db')
const db = await getDb()
```

## Anti-Patterns

```typescript
// ❌ Static import of db
import { db } from '~/lib/db'

// ❌ Accessing process.env directly in server/runtime code
const url = process.env.DATABASE_URL

// ❌ Dynamic-importing local feature modules without runtime need
const { createItemApplication } = await import('./application.server')
```

## Performance Note

Dynamic imports are cached by the JavaScript runtime. The first import loads the module, subsequent imports return the cached module. The `getDb()` function also maintains a singleton database instance.

## Related Skills

- `neon-database` - Database connection details
- `cloudflare-workers` - Deployment environment
- `tanstack-start` - Server function patterns
