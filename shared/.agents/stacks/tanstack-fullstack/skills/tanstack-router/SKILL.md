---
name: tanstack-router
description: TanStack Router best practices — type-safe routing, data loading, search params, navigation, and code splitting. Use when building React apps with TanStack Router.
---

# TanStack Router

Type-safe routing for React. Reference: [tanstack.com/router](https://tanstack.com/router). Rule structure adapted from DeckardGer/tanstack-agent-skills.

## Type Safety (CRITICAL)

### Register Router Type

```typescript
// src/routeTree.gen.ts is auto-generated
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// Register for global type inference
declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
```

### Use `from` for Type Narrowing

```typescript
// BAD — no type safety
const { id } = useParams()

// GOOD — type-safe, inferred from route
const { id } = Route.useParams()
// or
const { id } = useParams({ from: '/items/$id' })
```

### Type Route Context

```typescript
interface RouterContext { session: Session | null; queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})
```

## Route Organization (CRITICAL)

### File-Based Routing

```
app/routes/
├── __root.tsx           # Root layout
├── index.tsx            # / (home)
├── _authenticated.tsx   # Auth layout (pathless)
├── _authenticated/
│   ├── dashboard.tsx    # /dashboard
│   └── settings.tsx     # /settings
├── items/
│   ├── index.tsx        # /items
│   └── $id.tsx          # /items/:id
└── login.tsx            # /login
```

### Pathless Layouts

```typescript
// routes/_authenticated.tsx — no URL segment, just wraps children
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  component: () => <Outlet />,
})
```

## Data Loading (HIGH)

### Use Route Loaders

```typescript
export const Route = createFileRoute('/items/$id')({
  loader: async ({ params }) => {
    return await getItem(params.id)
  },
  component: ItemPage,
})

function ItemPage() {
  const item = Route.useLoaderData()
  return <div>{item.name}</div>
}
```

### With TanStack Query (Recommended)

```typescript
const itemQueryOptions = (id: string) => queryOptions({
  queryKey: ['items', id],
  queryFn: () => getItemFn({ data: { id } }),
})

export const Route = createFileRoute('/items/$id')({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(itemQueryOptions(params.id))
  },
  component: ItemPage,
})

function ItemPage() {
  const { id } = Route.useParams()
  const { data: item } = useSuspenseQuery(itemQueryOptions(id))
  return <div>{item.name}</div>
}
```

### Parallel Loading

```typescript
export const Route = createFileRoute('/dashboard')({
  loader: async ({ context: { queryClient } }) => {
    // Fire all in parallel
    await Promise.all([
      queryClient.ensureQueryData(statsQueryOptions()),
      queryClient.ensureQueryData(recentItemsQueryOptions()),
      queryClient.ensureQueryData(notificationsQueryOptions()),
    ])
  },
})
```

## Search Params (HIGH)

### Always Validate

```typescript
import { z } from 'zod'

const itemsSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  sort: z.enum(['name', 'date', 'price']).default('date'),
  filter: z.string().optional(),
})

export const Route = createFileRoute('/items')({
  validateSearch: itemsSearchSchema,
  component: ItemsPage,
})

function ItemsPage() {
  const { page, sort, filter } = Route.useSearch()
  // All typed and validated
}
```

### Navigate with Search Params

```tsx
<Link to="/items" search={{ page: 2, sort: 'name' }}>Page 2</Link>

// Programmatic
const navigate = useNavigate()
navigate({ to: '/items', search: (prev) => ({ ...prev, page: prev.page + 1 }) })
```

## Navigation (MEDIUM)

### Prefer `<Link>` Component

```tsx
// BAD
<a href="/items">Items</a>

// GOOD — type-safe, preloading, active states
<Link to="/items" activeProps={{ className: 'active' }}>Items</Link>
```

### Route Masks (Modal URLs)

```tsx
<Link to="/items/$id" params={{ id }} mask={{ to: '/items', unmaskOnReload: true }}>
  {item.name}
</Link>
```

## Code Splitting (MEDIUM)

### Lazy Routes

```typescript
// routes/items/$id.tsx — critical config only
export const Route = createFileRoute('/items/$id')({
  loader: async ({ params }) => getItem(params.id),
})

// routes/items/$id.lazy.tsx — component code (lazy loaded)
export const Route = createLazyFileRoute('/items/$id')({
  component: ItemPage,
})
```

### Auto Code Splitting

```typescript
// app.config.ts
export default defineConfig({
  tsr: { autoCodeSplitting: true },
})
```

## Error Handling

### Not Found

```typescript
export const Route = createFileRoute('/items/$id')({
  loader: async ({ params }) => {
    const item = await getItem(params.id)
    if (!item) throw notFound()
    return item
  },
  notFoundComponent: () => <div>Item not found</div>,
})
```

### Error Component

```typescript
const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => (
    <div>
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
    </div>
  ),
})
```
