---
name: nextjs-caching
description: "Next.js 16 Cache Components — PPR, 'use cache' directive, cacheLife(), cacheTag(), updateTag(). Use when implementing caching strategies or Partial Prerendering."
---

# Next.js Cache Components (v16+)

Adapted from the official `vercel-labs/next-skills` repo. Cache Components enable Partial Prerendering (PPR) — mix static, cached, and dynamic content in a single route.

## Enable

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true }
```

## Three Content Types

### 1. Static (auto-prerendered)
Synchronous code, pure computations — prerendered at build time.

### 2. Cached (`'use cache'`)
Async data that doesn't need fresh fetches every request:
```tsx
async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

### 3. Dynamic (Suspense)
Runtime data that must be fresh — wrap in Suspense:
```tsx
<Suspense fallback={<Skeleton />}>
  <UserPreferences />  {/* reads cookies, always fresh */}
</Suspense>
```

## `'use cache'` Directive

### File Level
```tsx
'use cache'
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Function Level
```tsx
async function getProducts() {
  'use cache'
  cacheLife('days')
  return await db.products.findMany()
}
```

### Component Level
```tsx
async function ProductList() {
  'use cache'
  cacheLife('hours')
  const products = await getProducts()
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}
```

## `cacheLife()` — Cache Duration

```tsx
import { cacheLife } from 'next/cache'

async function getData() {
  'use cache'
  cacheLife('hours')  // Use built-in profile
  return await fetchData()
}
```

### Built-in Profiles

| Profile | Stale | Revalidate | Expire |
|---------|-------|------------|--------|
| `'default'` | undefined | 15 min | undefined |
| `'seconds'` | undefined | 1 sec | 60 sec |
| `'minutes'` | 5 min | 1 min | 1 hour |
| `'hours'` | 5 min | 1 hour | 1 day |
| `'days'` | 5 min | 1 day | 1 week |
| `'weeks'` | 5 min | 1 week | 1 month |
| `'max'` | 5 min | 1 month | indefinite |

### Custom Profiles

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    product: { stale: 300, revalidate: 3600, expire: 86400 },
    blog: { stale: 60, revalidate: 900, expire: 3600 },
  },
}
```

```tsx
async function ProductPage() {
  'use cache'
  cacheLife('product')  // Use custom profile
}
```

### Inline Duration

```tsx
async function getData() {
  'use cache'
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
}
```

## `cacheTag()` — Tag for Revalidation

```tsx
import { cacheTag } from 'next/cache'

async function getPost(id: string) {
  'use cache'
  cacheTag(`post-${id}`, 'posts')
  return await db.posts.findUnique({ where: { id } })
}
```

## `updateTag()` — Revalidate by Tag

```tsx
'use server'
import { updateTag } from 'next/cache'

export async function updatePost(id: string, data: PostData) {
  await db.posts.update({ where: { id }, data })
  updateTag(`post-${id}`)  // Invalidate specific post
  updateTag('posts')        // Invalidate all posts
}
```

## PPR Pattern — Combining All Three

```tsx
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'

// Static shell — prerendered at build
export default function ProductPage() {
  return (
    <main>
      <h1>Products</h1>           {/* Static */}
      <ProductList />              {/* Cached */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart />                   {/* Dynamic */}
      </Suspense>
    </main>
  )
}

// Cached — revalidates hourly
async function ProductList() {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  const products = await db.products.findMany()
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// Dynamic — always fresh (reads cookies)
async function Cart() {
  const session = await cookies()
  const cartId = session.get('cartId')?.value
  const cart = await getCart(cartId)
  return <CartDisplay items={cart.items} />
}
```

## Rules

1. `'use cache'` functions must only accept serializable arguments
2. `cacheLife()` and `cacheTag()` can only be called inside `'use cache'` functions
3. Dynamic APIs (`cookies()`, `headers()`) inside `'use cache'` make it dynamic — use Suspense
4. Nested `'use cache'` — inner cache has its own lifetime independent of outer
5. `updateTag()` can only be called in Server Actions or Route Handlers
