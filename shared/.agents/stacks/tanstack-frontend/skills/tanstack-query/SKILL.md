---
name: tanstack-query
description: Client-side data fetching, caching, and synchronization with TanStack Query for SPA and frontend-only apps. Covers query keys, caching, mutations, and optimistic updates.
---

# TanStack Query (Frontend)

Client-side data fetching and caching for SPAs. No SSR/dehydration — pure browser patterns.

## Setup (CRITICAL)

```typescript
// src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1 min — don't refetch if fresh
      gcTime: 1000 * 60 * 5,       // 5 min — keep in cache after unmount
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

## Query Keys (CRITICAL)

Query keys are the cache identity. Structure them hierarchically:

```typescript
// src/features/posts/queries.ts
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
}

// Usage
useQuery({ queryKey: postKeys.detail(postId), queryFn: () => fetchPost(postId) })
queryClient.invalidateQueries({ queryKey: postKeys.lists() })  // Invalidate all lists
```

### queryOptions Helper

```typescript
// Define once, use in both useQuery and queryClient
export const postQueryOptions = (id: string) => queryOptions({
  queryKey: postKeys.detail(id),
  queryFn: () => fetchPost(id),
  staleTime: 1000 * 60 * 5,
})

// In component
const { data } = useQuery(postQueryOptions(postId))

// In router loader
loader: ({ params, context: { queryClient } }) =>
  queryClient.ensureQueryData(postQueryOptions(params.postId))
```

## Fetching Data (CRITICAL)

### useQuery

```typescript
function PostPage({ postId }: { postId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: () => fetchPost(postId),
    enabled: !!postId,  // Only run when postId exists
  })

  if (isLoading) return <Skeleton />
  if (isError) return <Error message={error.message} />
  return <Post data={data} />
}
```

### useSuspenseQuery (Preferred with Suspense)

```typescript
// Eliminates loading/error states in component — handled by boundaries
function PostPage({ postId }: { postId: string }) {
  const { data } = useSuspenseQuery(postQueryOptions(postId))
  return <Post data={data} />
}

// Wrap with boundaries
<ErrorBoundary fallback={<Error />}>
  <Suspense fallback={<Skeleton />}>
    <PostPage postId={postId} />
  </Suspense>
</ErrorBoundary>
```

### Parallel Queries

```typescript
// useQueries for dynamic parallel fetching
const results = useQueries({
  queries: postIds.map(id => postQueryOptions(id)),
})
```

## Mutations (HIGH)

```typescript
const createPost = useMutation({
  mutationFn: (data: CreatePostInput) => api.post('/posts', data),
  onSuccess: (newPost) => {
    // Update cache directly (no refetch needed)
    queryClient.setQueryData(postKeys.detail(newPost.id), newPost)
    // Invalidate list so it refetches
    queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    toast.success('Post created')
    navigate({ to: '/posts/$postId', params: { postId: newPost.id } })
  },
  onError: (error) => {
    toast.error(error.message)
  },
})

// Usage
<button
  onClick={() => createPost.mutate({ title, content })}
  disabled={createPost.isPending}
>
  {createPost.isPending ? 'Creating...' : 'Create Post'}
</button>
```

### Optimistic Updates

```typescript
const updatePost = useMutation({
  mutationFn: (data: UpdatePostInput) => api.patch(`/posts/${data.id}`, data),
  onMutate: async (newData) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: postKeys.detail(newData.id) })
    // Snapshot current value
    const previous = queryClient.getQueryData(postKeys.detail(newData.id))
    // Optimistically update
    queryClient.setQueryData(postKeys.detail(newData.id), old => ({ ...old, ...newData }))
    return { previous }
  },
  onError: (_, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(postKeys.detail(newData.id), context?.previous)
  },
  onSettled: (_, __, newData) => {
    queryClient.invalidateQueries({ queryKey: postKeys.detail(newData.id) })
  },
})
```

## Caching Patterns (HIGH)

### Prefetching

```typescript
// Prefetch on hover
function PostLink({ postId }: { postId: string }) {
  const queryClient = useQueryClient()
  return (
    <Link
      to="/posts/$postId"
      params={{ postId }}
      onMouseEnter={() => queryClient.prefetchQuery(postQueryOptions(postId))}
    >
      View Post
    </Link>
  )
}
```

### Infinite Queries

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: postKeys.lists(),
  queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})

// Flatten pages
const posts = data?.pages.flatMap(page => page.items) ?? []
```

## Error Handling (MEDIUM)

```typescript
// Global error handler
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showToast) {
        toast.error(`Error: ${error.message}`)
      }
    },
  }),
})

// Per-query error handling
useQuery({
  queryKey: postKeys.detail(postId),
  queryFn: () => fetchPost(postId),
  meta: { showToast: true },
  throwOnError: (error) => error.status >= 500,  // Only throw 5xx to error boundary
})
```

## Performance (MEDIUM)

```typescript
// Select to prevent unnecessary re-renders
const postTitle = useQuery({
  queryKey: postKeys.detail(postId),
  queryFn: () => fetchPost(postId),
  select: (data) => data.title,  // Component only re-renders when title changes
})

// Placeholder data while loading
const { data } = useQuery({
  queryKey: postKeys.detail(postId),
  queryFn: () => fetchPost(postId),
  placeholderData: keepPreviousData,  // Show stale data while fetching
})
```

## Common Mistakes

- **Don't put non-serializable values in query keys** — no functions, class instances, or Dates
- **Don't use `isLoading` with `enabled: false`** — use `isPending && isFetching` instead
- **Don't invalidate too broadly** — `invalidateQueries({ queryKey: ['posts'] })` hits everything
- **Don't forget `enabled`** — queries with undefined params will fire with `undefined`
