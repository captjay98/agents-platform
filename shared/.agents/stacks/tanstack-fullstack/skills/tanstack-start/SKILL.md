---
name: tanstack-start
description: TanStack Start best practices for full-stack React apps — server functions, middleware, SSR, authentication, and deployment. Use when building with TanStack Start.
---

# TanStack Start

Full-stack React framework built on TanStack Router. Reference: [tanstack.com/start](https://tanstack.com/start). Rule structure adapted from DeckardGer/tanstack-agent-skills.

## Server Functions (CRITICAL)

### Create Server Functions with `createServerFn`

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getUserFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await db.selectFrom('users').where('id', '=', data.id).executeTakeFirst()
    if (!user) throw new Error('User not found')
    return user
  })
```

### Always Validate Inputs

```typescript
// BAD — no validation
export const updateUserFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    await db.updateTable('users').set(data).execute() // data is unknown!
  })

// GOOD — schema validation
export const updateUserFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
  }))
  .handler(async ({ data }) => {
    await db.updateTable('users').set(data).where('id', '=', data.id).execute()
  })
```

### Method Selection

| Method | Use for | Caching |
|--------|---------|---------|
| `GET` | Reads, queries, fetching data | Can be cached |
| `POST` | Mutations, writes, side effects | Never cached |

### Error Handling

```typescript
export const createItemFn = createServerFn({ method: 'POST' })
  .inputValidator(createItemSchema)
  .handler(async ({ data }) => {
    try {
      return await insertItem(data)
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new Error('Item already exists')
      }
      throw new Error('Failed to create item')
    }
  })
```

## Middleware (HIGH)

### Request Middleware

```typescript
import { createMiddleware } from '@tanstack/react-start'

const authMiddleware = createMiddleware()
  .server(async ({ next }) => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    return next({ context: { session } })
  })

// Use in server functions
export const getProfileFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return await getUserProfile(context.session.userId)
  })
```

### Compose Middleware

```typescript
const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  const start = Date.now()
  const result = await next()
  console.log(`Request took ${Date.now() - start}ms`)
  return result
})

// Chain middleware — executes left to right
export const protectedFn = createServerFn({ method: 'GET' })
  .middleware([loggingMiddleware, authMiddleware])
  .handler(async ({ context }) => { /* ... */ })
```

## Authentication (HIGH)

### Protect Routes with `beforeLoad`

```typescript
// routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
})
```

### Verify Auth in Server Functions

```typescript
export const deleteItemFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const item = await getItem(data.id)
    if (item.ownerId !== context.session.userId) {
      throw new Error('Forbidden')
    }
    await deleteItem(data.id)
  })
```

## SSR & Hydration (MEDIUM)

### Streaming SSR

```typescript
// app.config.ts
export default defineConfig({
  server: { preset: 'cloudflare-pages' },
  tsr: { autoCodeSplitting: true },
})
```

### Hydration Safety

```typescript
// BAD — different output on server vs client
function Timestamp() {
  return <span>{new Date().toLocaleString()}</span>
}

// GOOD — consistent output, hydrate on client
function Timestamp() {
  const [time, setTime] = useState<string>()
  useEffect(() => { setTime(new Date().toLocaleString()) }, [])
  return <span>{time ?? 'Loading...'}</span>
}
```

### Prerendering

```typescript
export const Route = createFileRoute('/about')({
  prerender: true,  // Static at build time
})
```

## File Organization (LOW)

### Separate Server and Client Code

```
app/features/items/
├── server.ts       # Server functions (createServerFn)
├── service.ts      # Pure business logic
├── repository.ts   # Database operations
├── components.tsx   # React components
├── types.ts        # Shared types
└── index.ts        # Public exports
```

### Deployment Adapters

| Platform | Adapter |
|----------|---------|
| Cloudflare Pages | `cloudflare-pages` |
| Vercel | `vercel` |
| Netlify | `netlify` |
| Node.js | `node-server` |
| Bun | `bun` |
| Static | `static` |
