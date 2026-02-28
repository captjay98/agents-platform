---
name: tanstack-router
description: Client-side routing with TanStack Router for SPA and frontend-only apps. Type-safe routes, search params, navigation, and code splitting without SSR.
---

# TanStack Router (Frontend)

Client-side routing patterns for SPAs. No server functions or SSR — pure browser routing.

## Setup (CRITICAL)

### File-Based Routing (Recommended)

```
src/routes/
├── __root.tsx          # Root layout
├── index.tsx           # / route
├── about.tsx           # /about
├── posts/
│   ├── index.tsx       # /posts
│   └── $postId.tsx     # /posts/:postId
└── _auth/              # Pathless layout (auth guard)
    ├── dashboard.tsx   # /dashboard
    └── settings.tsx    # /settings
```

```typescript
// vite.config.ts
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
})
```

### Router Setup

```typescript
// src/main.tsx
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
```

## Route Definition (CRITICAL)

### Basic Route

```typescript
// src/routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return await fetchPost(params.postId)
  },
  component: PostPage,
  pendingComponent: PostSkeleton,
  errorComponent: PostError,
  notFoundComponent: PostNotFound,
})

function PostPage() {
  const post = Route.useLoaderData()
  const { postId } = Route.useParams()
  return <article>{post.title}</article>
}
```

### Root Layout

```typescript
// src/routes/__root.tsx
export const Route = createRootRoute({
  component: () => (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/posts">Posts</Link>
      </nav>
      <Outlet />
    </div>
  ),
})
```

## Type-Safe Navigation (HIGH)

### Link Component

```typescript
// Fully type-checked — TypeScript errors on invalid routes/params
<Link to="/posts/$postId" params={{ postId: post.id }}>
  {post.title}
</Link>

// Active styling
<Link to="/posts" activeProps={{ className: 'font-bold' }} activeOptions={{ exact: true }}>
  Posts
</Link>
```

### Programmatic Navigation

```typescript
const navigate = useNavigate()

// Type-safe — params are required and typed
await navigate({ to: '/posts/$postId', params: { postId: '123' } })

// Replace history entry
await navigate({ to: '/login', replace: true })
```

## Search Params (HIGH)

### Define and Validate

```typescript
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().int().positive().default(1),
  q: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export const Route = createFileRoute('/posts')({
  validateSearch: searchSchema,
  component: PostsPage,
})
```

### Read and Update

```typescript
function PostsPage() {
  const { page, q, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <div>
      <input
        value={q ?? ''}
        onChange={e => navigate({ search: prev => ({ ...prev, q: e.target.value, page: 1 }) })}
      />
      <Link to="." search={prev => ({ ...prev, page: prev.page + 1 })}>
        Next
      </Link>
    </div>
  )
}
```

## Layouts and Guards (HIGH)

### Pathless Layout Route (Auth Guard)

```typescript
// src/routes/_auth.tsx — matches /dashboard, /settings, etc.
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const user = await getUser()
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user }
  },
  component: () => <Outlet />,
})
```

### Nested Layouts

```typescript
// src/routes/posts.tsx — layout for all /posts/* routes
export const Route = createFileRoute('/posts')({
  component: () => (
    <div className="posts-layout">
      <PostsSidebar />
      <Outlet />
    </div>
  ),
})
```

## Code Splitting (MEDIUM)

```typescript
// Lazy-load heavy components
export const Route = createFileRoute('/dashboard')({
  component: lazyRouteComponent(() => import('../components/Dashboard')),
})

// Or with explicit chunk naming
const Dashboard = lazy(() => import('../components/Dashboard'))
export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})
```

## Data Loading Patterns (MEDIUM)

### Parallel Loaders

```typescript
export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // Parallel — don't await sequentially
    const [user, stats, notifications] = await Promise.all([
      fetchUser(),
      fetchStats(),
      fetchNotifications(),
    ])
    return { user, stats, notifications }
  },
})
```

### Preloading on Hover

```typescript
// Router-level default
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',  // Preload on hover/focus
  defaultPreloadStaleTime: 1000 * 30,
})
```

## Error Handling (MEDIUM)

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) throw notFound()
    return post
  },
  errorComponent: ({ error }) => (
    <div>Error: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div>Post not found</div>
  ),
})
```

## Common Mistakes

- **Don't use `useParams` from React Router** — use `Route.useParams()` for type safety
- **Don't mutate search params directly** — always use the updater function `prev => ({ ...prev })`
- **Don't nest `<RouterProvider>` inside components** — it must be at the root
- **Don't skip `validateSearch`** — unvalidated search params are `unknown` type
