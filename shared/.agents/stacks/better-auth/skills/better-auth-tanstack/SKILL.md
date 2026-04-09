---
name: better-auth-tanstack
description: Better Auth integration with TanStack Start — async getAuth() factory, tanstackStartCookies plugin, Cloudflare Workers env resolution, access control, and session middleware. Use when implementing authentication.
---

# Better Auth + TanStack Start

Async `getAuth()` factory pattern for Cloudflare Workers compatibility.

## Auth Config (CRITICAL)

`getAuth()` is async because it resolves env vars from Cloudflare Workers bindings or `process.env`:

```typescript
// features/shared/auth/config.ts
import { betterAuth } from 'better-auth'
import { admin, emailOTP, phoneNumber } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { ac, roles } from './permissions'

let envCache: Record<string, string | undefined> | null = null

async function getEnv() {
  if (envCache) return envCache
  try {
    // Cloudflare Workers: use bindings
    const { env } = await import('cloudflare:workers')
    envCache = {
      DATABASE_URL: (env as any).DATABASE_URL,
      BETTER_AUTH_SECRET: (env as any).BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: (env as any).BETTER_AUTH_URL,
    }
  } catch {
    // Node.js/Bun fallback
    envCache = {
      DATABASE_URL: process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    }
  }
  return envCache
}

let authInstance: ReturnType<typeof betterAuth> | null = null

export async function getAuth() {
  if (authInstance) return authInstance
  const env = await getEnv()

  authInstance = betterAuth({
    database: { /* Kysely/Postgres pool */ },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [
      tanstackStartCookies(),  // Cookie handling for TanStack Start
      admin({ ac, roles }),
      emailOTP({ /* config */ }),
      phoneNumber({ /* config */ }),
    ],
  })
  return authInstance
}
```

## Permissions (CRITICAL)

Access control via Better Auth's `createAccessControl`:

```typescript
// features/shared/auth/permissions.ts
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/admin/access'

export const statement = {
  ...defaultStatements,
  farm: ['view', 'edit', 'delete', 'manage-access'],
  batch: ['view', 'create', 'edit', 'delete'],
  report: ['view', 'export'],
} as const

export const ac = createAccessControl(statement)

export const roles = {
  admin: ac.newRole({ farm: ['view', 'edit', 'delete', 'manage-access'], batch: ['view', 'create', 'edit', 'delete'] }),
  farmer: ac.newRole({ farm: ['view', 'edit'], batch: ['view', 'create', 'edit'] }),
  worker: ac.newRole({ farm: ['view'], batch: ['view'] }),
}
```

## Auth Middleware (CRITICAL)

`requireAuth()` for server functions — always dynamically imported:

```typescript
// features/shared/auth/session/auth-middleware.server.ts
export async function requireAuth(): Promise<{ user: User }> {
  const auth = await getAuth()
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session?.user) throw new AppError('UNAUTHORIZED')
  return { user: normalizeAuthUser(session.user) }
}

// Usage in .functions.ts — always dynamic import
export const getProfileFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { withErrorBoundary } = await import('~/features/shared/utils/error-boundary.server')
    return withErrorBoundary('profile.get', 'profile', async () => {
      const { requireAuth } = await import('~/features/shared/auth/session/auth-middleware.server')
      const session = await requireAuth()
      // ...
    })
  })
```

## Auth API Route (HIGH)

Manual routing in `server.ts` (not `createAPIFileRoute`):

```typescript
// server.ts
export default createStartHandler({
  createRouter,
})(async ({ request }) => {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/auth')) {
    const auth = await getAuth()
    return auth.handler(request)
  }
})
```

## Client Auth (HIGH)

```typescript
// features/shared/auth/client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL,
})

// Usage in components
const { data: session } = authClient.useSession()
await authClient.signIn.email({ email, password })
await authClient.signOut()
```

## Rules

- Always use `getAuth()` async factory — never import auth instance directly
- `tanstackStartCookies()` plugin is required for cookie-based sessions in TanStack Start
- Cloudflare Workers env resolution tries `cloudflare:workers` first, falls back to `process.env`
- `requireAuth()` is always dynamically imported in `.functions.ts`
- Permissions defined in `permissions.ts` — single source of truth for roles and access control
- Auth API handled via manual routing in `server.ts`, not file-based API routes
