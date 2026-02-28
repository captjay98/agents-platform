---
name: tanstack-integration
description: Integrating TanStack Query with TanStack Router and Start — data flow patterns, SSR hydration, and caching coordination. Use when combining TanStack libraries.
---

# TanStack Integration

Patterns for combining TanStack Query, Router, and Start. Adapted from DeckardGer/tanstack-agent-skills.

## Setup (CRITICAL)

### Pass QueryClient Through Router Context

```typescript
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
})
```

### Root Route Context Type

```typescript
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext { queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <ReactQueryDevtools />
    </QueryClientProvider>
  ),
})
```

## Data Flow Pattern (CRITICAL)

### Loader + Query Pattern

The recommended pattern: loaders ensure data is available, components consume via `useSuspenseQuery`.

```typescript
// 1. Define query options (shared between loader and component)
const itemQueryOptions = (id: string) => queryOptions({
  queryKey: ['items', id],
  queryFn: () => getItemFn({ data: { id } }),
})

// 2. Loader ensures data is in cache
export const Route = createFileRoute('/items/$id')({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(itemQueryOptions(params.id))
  },
  component: ItemPage,
})

// 3. Component reads from cache (instant, no loading state)
function ItemPage() {
  const { id } = Route.useParams()
  const { data: item } = useSuspenseQuery(itemQueryOptions(id))
  return <div>{item.name}</div>
}
```

### Why This Pattern?

| Concern | Handled by |
|---------|-----------|
| Data fetching | Loader (runs before render) |
| Caching | TanStack Query (staleTime, gcTime) |
| Type safety | queryOptions + useSuspenseQuery |
| Refetching | TanStack Query (window focus, interval) |
| Loading states | Router (pending component) |

### Server Functions as Query Functions

```typescript
// Use server functions for the actual data fetching
const itemQueryOptions = (id: string) => queryOptions({
  queryKey: ['items', id],
  queryFn: () => getItemFn({ data: { id } }),  // server function
})
```

## Caching Coordination (HIGH)

### Let Query Manage Caching

```typescript
// BAD — double caching (router + query)
export const Route = createFileRoute('/items')({
  loader: async () => {
    return await getItems()  // Router caches this
  },
})
function ItemsPage() {
  const items = Route.useLoaderData()  // Stale if navigated away and back
}

// GOOD — single cache source (query)
export const Route = createFileRoute('/items')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(itemsQueryOptions())
  },
})
function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQueryOptions())  // Always fresh
}
```

### Coordinate staleTime

```typescript
// Router's defaultPreloadStaleTime should match Query's staleTime
const router = createRouter({
  routeTree,
  defaultPreloadStaleTime: 1000 * 60,  // 1 min — matches query default
  context: { queryClient },
})
```

## SSR Integration (HIGH)

### Automatic with TanStack Start

```typescript
// app/router.tsx
import { setupRouterSsrQueryIntegration } from '@tanstack/react-start'

const router = createRouter({
  routeTree,
  context: { queryClient },
})

// Handles dehydration/hydration automatically
setupRouterSsrQueryIntegration(router, queryClient)
```

### Per-Request QueryClient (Server)

```typescript
// Important: create a new QueryClient per request to avoid data leaks
function createRequestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
      },
    },
  })
}
```

## Mutations + Invalidation

```typescript
const createItem = useMutation({
  mutationFn: (data: CreateItemInput) => createItemFn({ data }),
  onSuccess: () => {
    // Invalidate list queries so they refetch
    queryClient.invalidateQueries({ queryKey: ['items', 'list'] })
    // Navigate to the new item
    navigate({ to: '/items' })
  },
})
```
