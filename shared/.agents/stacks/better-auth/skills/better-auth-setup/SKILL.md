---
name: better-auth-setup
description: Setting up Better Auth for email/password authentication — database schema, server config, session management, and middleware. Use when implementing authentication.
---

# Better Auth Setup

Better Auth is a TypeScript-first authentication library with built-in session management, plugins, and framework adapters.

## Installation (CRITICAL)

```bash
npm install better-auth
```

## Database Schema (CRITICAL)

Better Auth uses separate tables for users and credentials:

| Table | Purpose |
|-------|---------|
| `users` | User profile data (name, email, role) — NO password |
| `accounts` | Auth credentials (hashed password, OAuth tokens, providerId) |
| `sessions` | Active sessions |
| `verifications` | Email verification tokens |

**Important**: Passwords are stored in `accounts`, not `users`.

```bash
# Generate and run migrations
npx better-auth migrate
```

## Server Configuration (CRITICAL)

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { db } from './db'

export const auth = betterAuth({
  database: {
    type: 'postgres',
    db,  // Pass your database client
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // Set true for production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,         // Refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,  // Cache session for 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,  // Not settable by user
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

## API Route Handler (CRITICAL)

```typescript
// app/api/auth/[...all]/route.ts (Next.js App Router)
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

```typescript
// TanStack Start — app/routes/api/auth/$.ts
import { auth } from '~/lib/auth'

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

## Client Setup (HIGH)

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

export const { signIn, signOut, signUp, useSession } = authClient
```

## Auth Middleware (HIGH)

```typescript
// Server-side session check
async function requireAuth(request?: Request): Promise<Session> {
  const session = await auth.api.getSession({
    headers: request?.headers ?? new Headers(),
  })

  if (!session) {
    throw new Error('UNAUTHORIZED')
  }

  return session
}

// Role check
async function requireRole(role: string, request?: Request): Promise<Session> {
  const session = await requireAuth(request)
  if (session.user.role !== role) {
    throw new Error('FORBIDDEN')
  }
  return session
}
```

## Creating Users Programmatically (HIGH)

```typescript
// ✅ Use Better Auth's API — handles hashing and account creation
await auth.api.signUpEmail({
  body: {
    email: 'user@example.com',
    password: 'securepassword',
    name: 'John Doe',
  },
})

// ❌ Never insert directly into users table with a password field
// The users table has no password column — it's in accounts
```

## Client Usage (HIGH)

```typescript
// Sign in
const { data, error } = await signIn.email({
  email: 'user@example.com',
  password: 'password',
  callbackURL: '/dashboard',
})

// Sign out
await signOut()

// Get session in React
function UserMenu() {
  const { data: session, isPending } = useSession()

  if (isPending) return <Spinner />
  if (!session) return <SignInButton />

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

## Rules

- Never store passwords in the `users` table — use Better Auth's API for user creation
- Always use `requireAuth()` in server functions before accessing user data
- Always set `cookieCache` to reduce database hits on every request
- Use `input: false` for sensitive fields like `role` to prevent user manipulation
