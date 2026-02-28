---
name: better-auth-tanstack
description: Integrating Better Auth with TanStack Start and TanStack Router — server functions, route guards, and session management. Use when building auth in TanStack Start apps.
---

# Better Auth with TanStack

Better Auth integration patterns for TanStack Start (server functions) and TanStack Router (route guards).

## Server Setup (CRITICAL)

```typescript
// app/lib/auth.ts
import { betterAuth } from 'better-auth'
import { db } from './db'

export const auth = betterAuth({
  database: { type: 'postgres', db },
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
})
```

## API Route (CRITICAL)

```typescript
// app/routes/api/auth/$.ts
import { auth } from '~/lib/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

## Auth Client (CRITICAL)

```typescript
// app/lib/auth-client.ts
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL ?? 'http://localhost:3000',
})

export const { signIn, signOut, signUp, useSession } = authClient
```

## Server Middleware (HIGH)

```typescript
// app/features/auth/middleware.ts
import { auth } from '~/lib/auth'
import { getWebRequest } from '@tanstack/react-start/server'

export async function requireAuth() {
  const request = getWebRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    throw new Error('UNAUTHORIZED')
  }

  return session
}

export async function getOptionalSession() {
  const request = getWebRequest()
  return auth.api.getSession({ headers: request.headers })
}
```

## Server Functions (HIGH)

```typescript
// app/features/posts/server.ts
import { createServerFn } from '@tanstack/react-start'
import { requireAuth } from '~/features/auth/middleware'

export const getMyPostsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await requireAuth()
    return getPostsByUser(session.user.id)
  })

export const createPostFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ title: z.string(), content: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireAuth()
    return createPost({ ...data, userId: session.user.id })
  })
```

## Route Guards (HIGH)

```typescript
// app/routes/_auth.tsx — protects all routes under _auth/
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getOptionalSession } from '~/features/auth/middleware'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const session = await getOptionalSession()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { session }
  },
  component: () => <Outlet />,
})

// Access session in child routes
function DashboardPage() {
  const { session } = Route.useRouteContext()
  return <div>Welcome, {session.user.name}</div>
}
```

## Login Page (HIGH)

```typescript
// app/routes/login.tsx
export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    const { error } = await signIn.email({
      email: form.get('email') as string,
      password: form.get('password') as string,
    })

    if (error) {
      setError(error.message)
      return
    }

    navigate({ to: redirectTo ?? '/dashboard' })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  )
}
```

## Session in Components (MEDIUM)

```typescript
// Read session on client
function UserMenu() {
  const { data: session, isPending } = useSession()

  if (isPending) return <Spinner />
  if (!session) return null

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => signOut({ fetchOptions: { onSuccess: () => navigate({ to: '/login' }) } })}>
        Sign Out
      </button>
    </div>
  )
}
```

## Rules

- Always call `requireAuth()` at the top of every server function that accesses user data
- Always use `beforeLoad` in route files for auth guards — never check auth inside components
- Always pass `redirect` search param to login page so users return to their destination
- Never expose session data in loader return values — use `routeContext` instead
