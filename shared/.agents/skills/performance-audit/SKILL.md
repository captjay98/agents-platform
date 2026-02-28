---
name: performance-audit
description: Auditing and optimizing Core Web Vitals, bundle size, and runtime performance. Use when the application feels slow or before a production release.
---

# Performance Audit

Systematic approach to identifying and fixing performance bottlenecks.

## Core Web Vitals Targets (CRITICAL)

| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| LCP (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| INP (Interaction to Next Paint) | <200ms | 200-500ms | >500ms |
| CLS (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |
| TTFB (Time to First Byte) | <800ms | 800-1800ms | >1800ms |

## Audit Process (CRITICAL)

```bash
# 1. Run Lighthouse (Chrome DevTools → Lighthouse tab)
# Use Mobile + Throttled 4G for realistic scores

# 2. Analyze bundle
npx vite-bundle-visualizer  # or
npx @next/bundle-analyzer

# 3. Check network waterfall (DevTools → Network tab)
# Look for: render-blocking resources, large payloads, sequential requests
```

## Bundle Optimization (HIGH)

### Code Splitting

```typescript
// ❌ Eager import — loads everything upfront
import { HeavyDashboard } from './dashboard'

// ✅ Lazy import — loads only when needed
const HeavyDashboard = lazy(() => import('./dashboard'))

// TanStack Router — automatic per-route splitting
export const Route = createFileRoute('/dashboard')({
  component: lazyRouteComponent(() => import('../components/Dashboard')),
})
```

### Tree Shaking

```typescript
// ❌ Imports entire library
import _ from 'lodash'
import * as dateFns from 'date-fns'

// ✅ Named imports — tree-shakeable
import { debounce } from 'lodash-es'
import { format, parseISO } from 'date-fns'

// ❌ Dynamic locale loading (loads all locales)
import 'date-fns/locale'

// ✅ Import only needed locale
import { enUS } from 'date-fns/locale'
```

### Dependency Audit

```bash
# Find large dependencies
npx bundlephobia-cli lodash moment

# Check for duplicates
npx duplicate-package-checker-webpack-plugin

# Analyze what's in your bundle
npx source-map-explorer dist/assets/*.js
```

## Image Optimization (HIGH)

```html
<!-- ❌ Unoptimized -->
<img src="/hero.png" />

<!-- ✅ Optimized -->
<img
  src="/hero.webp"
  width="1200"
  height="600"
  loading="lazy"
  decoding="async"
  alt="Hero image"
/>

<!-- ✅ Responsive with srcset -->
<img
  srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="/hero-1200.webp"
  alt="Hero image"
/>
```

## React Performance (HIGH)

```typescript
// Prevent unnecessary re-renders
const MemoizedComponent = memo(({ data }: { data: Post[] }) => {
  return <PostList posts={data} />
})

// Expensive calculations
const sortedPosts = useMemo(
  () => posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  [posts]
)

// Stable callbacks
const handleClick = useCallback((id: string) => {
  navigate({ to: '/posts/$postId', params: { postId: id } })
}, [navigate])

// Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual'
```

## Network Optimization (MEDIUM)

```typescript
// Prefetch on hover
<Link
  to="/posts/$postId"
  params={{ postId: post.id }}
  onMouseEnter={() => queryClient.prefetchQuery(postQueryOptions(post.id))}
>

// Parallel data fetching — never sequential
const [posts, user, stats] = await Promise.all([
  fetchPosts(),
  fetchUser(),
  fetchStats(),
])

// Avoid N+1 — batch requests
// ❌ N+1
const posts = await getPosts()
for (const post of posts) {
  post.author = await getUser(post.userId)  // N queries
}

// ✅ Batch
const posts = await getPosts()
const userIds = [...new Set(posts.map(p => p.userId))]
const users = await getUsersByIds(userIds)  // 1 query
```

## CLS Prevention (MEDIUM)

```html
<!-- Always set dimensions on images -->
<img width="400" height="300" src="..." />

<!-- Reserve space for dynamic content -->
<div style="min-height: 200px">
  {isLoading ? <Skeleton /> : <Content />}
</div>

<!-- Avoid inserting content above existing content -->
<!-- Use fixed-position banners, not top-inserted banners -->
```

## Optimization Checklist

- [ ] Lighthouse score ≥ 90 on mobile
- [ ] Bundle size < 200KB gzipped (initial)
- [ ] All images use WebP with explicit dimensions
- [ ] Heavy routes are code-split
- [ ] No render-blocking resources
- [ ] Long lists are virtualized (>100 items)
- [ ] No N+1 queries in data fetching
