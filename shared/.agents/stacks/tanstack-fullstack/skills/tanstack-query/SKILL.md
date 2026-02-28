---
name: tanstack-query
description: TanStack Query best practices — data fetching, caching, mutations, optimistic updates, prefetching, SSR, and offline support. Use when managing server state in React apps.
---

# TanStack Query

Server state management for React. Reference: [tanstack.com/query](https://tanstack.com/query). Rule structure adapted from DeckardGer/tanstack-agent-skills.

## Query Keys (CRITICAL)

### Always Use Arrays

```typescript
// BAD
useQuery({ queryKey: 'items' })

// GOOD
useQuery({ queryKey: ['items'] })
useQuery({ queryKey: ['items', id] })
useQuery({ queryKey: ['items', { status: 'active', page: 1 }] })
```

### Include All Dependencies

```typescript
// BAD — stale data when filters change
useQuery({ queryKey: ['items'], queryFn: () => fetchItems(filters) })

// GOOD — refetches when filters change
useQuery({ queryKey: ['items', filters], queryFn: () => fetchItems(filters) })
```

### Query Key Factory Pattern

```typescript
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: ItemFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
}

// Usage
useQuery({ queryKey: itemKeys.detail(id), queryFn: () => getItem(id) })
queryClient.invalidateQueries({ queryKey: itemKeys.lists() }) // invalidate all lists
```

## Caching (CRITICAL)

### staleTime vs gcTime

| Option | Default | Purpose |
|--------|---------|---------|
| `staleTime` | 0 | How long data is "fresh" (no refetch) |
| `gcTime` | 5 min | How long inactive data stays in cache |

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 min — data is fresh
      gcTime: 1000 * 60 * 10,   // 10 min — keep in cache
      refetchOnWindowFocus: false,
    },
  },
})
```

### Targeted Invalidation

```typescript
// BAD — invalidates everything
queryClient.invalidateQueries()

// GOOD — targeted
queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) })  // one item
queryClient.invalidateQueries({ queryKey: itemKeys.lists() })     // all lists
queryClient.invalidateQueries({ queryKey: itemKeys.all })         // all item queries
```

### Placeholder vs Initial Data

```typescript
// placeholderData — shown while loading, replaced when real data arrives
useQuery({
  queryKey: itemKeys.detail(id),
  queryFn: () => getItem(id),
  placeholderData: () => queryClient.getQueryData(itemKeys.list({}))?.find(i => i.id === id),
})

// initialData — treated as real cached data (has staleTime)
useQuery({
  queryKey: itemKeys.detail(id),
  queryFn: () => getItem(id),
  initialData: () => queryClient.getQueryData(itemKeys.list({}))?.find(i => i.id === id),
  initialDataUpdatedAt: () => queryClient.getQueryState(itemKeys.list({}))?.dataUpdatedAt,
})
```

## Mutations (HIGH)

### Always Invalidate After Mutation

```typescript
const createItem = useMutation({
  mutationFn: (data: CreateItemInput) => createItemFn({ data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: itemKeys.lists() })
  },
})
```

### Optimistic Updates

```typescript
const updateItem = useMutation({
  mutationFn: (data: UpdateItemInput) => updateItemFn({ data }),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: itemKeys.detail(newData.id) })
    const previous = queryClient.getQueryData(itemKeys.detail(newData.id))
    queryClient.setQueryData(itemKeys.detail(newData.id), (old) => ({ ...old, ...newData }))
    return { previous }
  },
  onError: (_err, _vars, context) => {
    if (context?.previous) {
      queryClient.setQueryData(itemKeys.detail(_vars.id), context.previous)
    }
  },
  onSettled: (_data, _err, vars) => {
    queryClient.invalidateQueries({ queryKey: itemKeys.detail(vars.id) })
  },
})
```

## Error Handling (HIGH)

### Error Boundaries

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

function ItemsWithErrorBoundary() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallbackRender={({ resetErrorBoundary }) => (
          <div>
            <p>Error loading items</p>
            <button onClick={resetErrorBoundary}>Retry</button>
          </div>
        )}>
          <ItemsList />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

### Retry Configuration

```typescript
useQuery({
  queryKey: itemKeys.detail(id),
  queryFn: () => getItem(id),
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
})
```

## Prefetching (MEDIUM)

### On Intent (Hover/Focus)

```tsx
function ItemLink({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient()
  return (
    <Link
      to="/items/$id"
      params={{ id }}
      onMouseEnter={() => queryClient.prefetchQuery(itemQueryOptions(id))}
    >
      {name}
    </Link>
  )
}
```

### In Route Loaders

```typescript
export const Route = createFileRoute('/items/$id')({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(itemQueryOptions(params.id))
  },
})
```

## SSR Integration (MEDIUM)

### Dehydrate/Hydrate Pattern

```tsx
// Entry server
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
const dehydratedState = dehydrate(queryClient)

// Entry client
<HydrationBoundary state={dehydratedState}>
  <App />
</HydrationBoundary>
```

## Performance (LOW)

### Select to Transform Data

```typescript
// Only re-renders when item names change
const { data: names } = useQuery({
  queryKey: itemKeys.list({}),
  queryFn: () => getItems(),
  select: (data) => data.map(item => item.name),
})
```

## Offline Support (LOW)

```typescript
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

const persister = createSyncStoragePersister({ storage: window.localStorage })
persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 })
```
