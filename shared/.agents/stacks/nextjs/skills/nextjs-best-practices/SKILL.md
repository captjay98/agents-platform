---
name: nextjs-best-practices
description: Comprehensive Next.js best practices covering file conventions, RSC boundaries, data patterns, async APIs (v15+), directives, error handling, route handlers, metadata, image/font optimization, bundling, hydration errors, and self-hosting. Auto-applied when working with Next.js code.
---

# Next.js Best Practices

Adapted from the official `vercel-labs/next-skills` repo. Always verify against [nextjs.org/docs](https://nextjs.org/docs).

## File Conventions

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI (Suspense boundary)
├── error.tsx           # Error UI (Error boundary, must be 'use client')
├── not-found.tsx       # 404 UI
├── global-error.tsx    # Global error UI (must include <html><body>)
├── route.ts            # API endpoint
├── template.tsx        # Re-rendered layout
├── default.tsx         # Parallel route fallback
├── blog/
│   ├── page.tsx        # /blog
│   └── [slug]/page.tsx # /blog/:slug
├── [...slug]/page.tsx  # Catch-all: /a/b/c
├── [[...slug]]/page.tsx # Optional catch-all
├── (group)/page.tsx    # Route group (no URL impact)
├── @modal/             # Parallel route slot
└── _components/        # Private folder (not a route)
```

**Next.js 16**: `middleware.ts` → `proxy.ts`, `middleware()` → `proxy()`, `config` → `proxyConfig`.

## RSC Boundaries

### Async Client Components Are Invalid

**Detect:** File has `'use client'` AND component is `async function`.

```tsx
// BAD
'use client'
export default async function Profile() {
  const user = await getUser() // Cannot await in client component
}

// GOOD — fetch in server parent, pass data down
export default async function Page() {
  const user = await getUser()
  return <Profile user={user} />
}
```

### Non-Serializable Props

Props from Server → Client must be JSON-serializable.

| Pass to client? | Type | Fix |
|-----------------|------|-----|
| ❌ | Functions | Define in client component |
| ❌ | `new Date()` | Use `.toISOString()` |
| ❌ | `Map`, `Set` | Convert to object/array |
| ❌ | Class instances | Pass plain object |
| ✅ | Server Actions (`'use server'`) | — |
| ✅ | Strings, numbers, booleans | — |
| ✅ | Plain objects, arrays | — |

## Data Patterns

### Decision Tree
```
Need data?
├─ Server Component? → Fetch directly (no API needed)
├─ Client mutation (POST/PUT/DELETE)? → Server Action
├─ Client read? → Pass from server parent OR Route Handler
├─ External API / webhooks? → Route Handler
└─ REST API for mobile/external? → Route Handler
```

### Avoiding Waterfalls

```tsx
// BAD — sequential
const user = await getUser()
const posts = await getPosts()

// GOOD — parallel
const [user, posts] = await Promise.all([getUser(), getPosts()])

// GOOD — streaming with Suspense
<Suspense fallback={<Skeleton />}>
  <UserSection />  {/* fetches independently */}
</Suspense>
```

### Preload Pattern
```tsx
import { cache } from 'react'
export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }))
export const preloadUser = (id: string) => { void getUser(id) }
```

## Async Patterns (Next.js 15+)

`params`, `searchParams`, `cookies()`, `headers()` are now async.

```tsx
// Pages and layouts
type Props = { params: Promise<{ slug: string }> }
export default async function Page({ params }: Props) {
  const { slug } = await params
}

// Route handlers
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// Cookies and headers
const cookieStore = await cookies()
const headersList = await headers()
```

Migration codemod: `npx @next/codemod@latest next-async-request-api .`

## Directives

| Directive | Scope | Purpose |
|-----------|-------|---------|
| `'use client'` | React | Marks Client Component (hooks, events, browser APIs) |
| `'use server'` | React | Marks Server Action (can be passed to client) |
| `'use cache'` | Next.js | Marks function/component for caching (requires `cacheComponents: true`) |

## Error Handling

### Error Boundaries
- `error.tsx` — catches errors in route segment (must be `'use client'`)
- `global-error.tsx` — catches root layout errors (must include `<html><body>`)
- `not-found.tsx` — custom 404 page

### Navigation API Gotcha

**Never wrap `redirect()`, `notFound()`, `forbidden()`, `unauthorized()` in try-catch** — they throw special errors.

```tsx
'use server'
async function createPost(formData: FormData) {
  let post
  try {
    post = await db.post.create({ ... })
  } catch (error) {
    return { error: 'Failed to create post' }
  }
  redirect(`/posts/${post.id}`)  // OUTSIDE try-catch
}
```

Or use `unstable_rethrow()`:
```tsx
import { unstable_rethrow } from 'next/navigation'
try {
  redirect('/success')
} catch (error) {
  unstable_rethrow(error)
  return { error: 'Something went wrong' }
}
```

## Route Handlers

```tsx
// app/api/posts/route.ts
export async function GET(request: NextRequest) {
  const posts = await db.post.findMany()
  return NextResponse.json(posts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const post = await db.post.create({ data: body })
  return NextResponse.json(post, { status: 201 })
}
```

**Use when:** external APIs, webhooks, mobile clients, GET caching.
**Don't use when:** internal reads (use Server Components) or UI mutations (use Server Actions).

## Image & Font Optimization

```tsx
// Always use next/image over <img>
import Image from 'next/image'
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// next/font — automatic optimization
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

## Hydration Errors

Common causes:
- Browser-only APIs (`window`, `localStorage`) in render
- `Date.now()` or `Math.random()` in render
- Invalid HTML nesting (`<p>` inside `<p>`, `<div>` inside `<p>`)
- Browser extensions modifying DOM

Fix: use `useEffect` for browser-only code, `suppressHydrationWarning` for intentional mismatches.

## Self-Hosting (Docker)

```ts
// next.config.ts
const nextConfig = { output: 'standalone' }
```

```dockerfile
FROM node:20-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```
