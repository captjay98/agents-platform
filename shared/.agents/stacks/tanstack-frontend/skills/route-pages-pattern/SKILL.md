---
name: route-pages-pattern
description: Separates TanStack Router config from UI components with thin route wrappers and reusable page components. Use when creating route files.
core_ref: agents-platform
core_version: 2026-03-03
overlay_mode: append
---

# Route-Pages Pattern

**Status**: ✅ Adopted with explicit TanStack lazy-route splits

The route-pages pattern separates TanStack Router configuration from UI components, creating thin route wrappers, matching `.lazy.tsx` UI files, and reusable page components.

## Architecture

```
app/routes/                          app/components/route-pages/
├── _auth/user/itemes/index.tsx  ├── user/itemes/itemes-page.tsx
├── _auth/user/farms/$farmId.tsx  ├── user/farms/farm-id/farm-id-page.tsx
├── _auth/admin/users/index.tsx     ├── admin/users/users-page.tsx
└── index.tsx                       └── public/home/home-page.tsx
```

## When To Use Route-Pages Pattern

### ✅ ALWAYS Use For:

- **Complex pages** with business logic, state management, or data fetching
- **Authenticated routes** that need loaders, validation, or auth guards
- **Layout components** that wrap multiple child routes
- **Pages with forms** that need validation and mutation handling
- **Any route that will be reused** or tested independently

### ❌ NEVER Use For:

- **Simple redirects** or routes with no UI
- **Error boundaries** (use inline error components)
- **One-line components** with no logic

## Pattern Examples

### 1. Data-Heavy Route (Recommended)

**Critical Route**: `app/routes/_auth/user/itemes/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { validateBatchSearch } from '~/features/user/itemes/validation'
import { offlineLoader } from '~/lib/offline-loader'

export const Route = createFileRoute('/_auth/user/itemes/')({
  validateSearch: validateBatchSearch,
  loaderDeps: ({ search }) => ({
    farmId: search.farmId as string | undefined,
    page: search.page as number | undefined,
    // ... other search params
  }),
  loader: async ({ deps }) => {
    const { getBatchesForFarmFn } = await import(
      '~/features/user/itemes/itemes.functions'
    )

    return offlineLoader('itemes', getBatchesForFarmFn, deps, {
      paginatedBatches: { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
      summary: null
    })
  },
})
```

**Lazy Route**: `app/routes/_auth/user/itemes/index.lazy.tsx`

```typescript
import { createLazyFileRoute } from '@tanstack/react-router'
import { ErrorPage } from '~/components/shared/error-page'
import { BatchesPage } from '~/components/route-pages/user/itemes/itemes-page'
import { PageSkeleton } from '~/components/ui/page-skeleton'

export const Route = createLazyFileRoute('/_auth/user/itemes/')({
  pendingComponent: () => PageSkeleton.Full({ statsCount: 2 }),
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
  component: BatchesPage,
})
```

**Page Component**: `app/components/route-pages/user/itemes/itemes-page.tsx`

```typescript
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useBatchMutations } from '~/features/user/itemes/mutations'

const routeApi = getRouteApi('/_auth/user/itemes/')

export function BatchesPage() {
  const { t } = useTranslation(['itemes', 'common'])
  const data = routeApi.useLoaderData()
  const searchParams = routeApi.useSearch()

  // All UI logic, state management, and business logic here
  return (
    <div>
      {/* Complex UI implementation */}
    </div>
  )
}
```

### 2. Layout Route

**Critical Route**: `app/routes/_auth/user.tsx`

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/user')({
  beforeLoad: ({ context }) => {
    const { user } = context
    if (user.userType === 'buyer') {
      throw redirect({ to: '/buyer' })
    }
    return {}
  },
})
```

**Lazy Route**: `app/routes/_auth/user.lazy.tsx`

```typescript
import { createLazyFileRoute } from '@tanstack/react-router'
import { FarmerLayout } from '~/components/route-pages/layouts/user/user-layout-page'

export const Route = createLazyFileRoute('/_auth/user')({
  component: FarmerLayout,
})
```

### 3. Simple Public Route

**Critical Route**: `app/routes/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({})
```

**Lazy Route**: `app/routes/index.lazy.tsx`

```typescript
import { createLazyFileRoute } from '@tanstack/react-router'
import { Index } from '~/components/route-pages/public/home/home-page'

export const Route = createLazyFileRoute('/')({
  component: Index,
})
```

## Naming Conventions

### Route Path → Page Component Mapping

| Route Path                        | Page Component Path                     |
| --------------------------------- | --------------------------------------- |
| `/_auth/user/itemes/index.tsx` | `user/itemes/itemes-page.tsx`       |
| `/_auth/user/farms/$farmId.tsx` | `user/farms/farm-id/farm-id-page.tsx` |
| `/_auth/admin/users/index.tsx`    | `admin/users/users-page.tsx`            |
| `/index.tsx`                      | `public/home/home-page.tsx`             |
| `/_auth.tsx`                      | `layouts/auth/auth-layout-page.tsx`     |

### Rules:

1. **Remove route prefixes**: `_auth/` → (removed)
2. **Convert params**: `$farmId` → `farm-id`
3. **Add suffix**: `-page.tsx`
4. **Index routes**: Use descriptive name (e.g., `itemes-page.tsx` not `index-page.tsx`)
5. **Layouts**: Place in `layouts/` subdirectory
6. **Public routes**: Place in `public/` subdirectory
7. **Root exception**: `app/routes/__root.tsx` is the only route allowed to own UI directly

## Critical Patterns

### 1. Loader Data Access

```typescript
// In page component
const routeApi = getRouteApi('/_auth/user/itemes/')
const data = routeApi.useLoaderData()
const searchParams = routeApi.useSearch()
```

### 2. Offline-First Loaders

```typescript
// Always wrap server functions in offlineLoader
return offlineLoader('cacheKey', serverFunction, deps, fallbackData)
```

### 3. Loader-First by Default

```typescript
loader: async ({ context, params }) => {
  await context.queryClient.ensureQueryData(itemQueryOptions(params.id))
}
```

Keep `useQuery(...)` in the page only when it is seeded by the loader and still
needs Query features like background refresh, polling, or shared live cache.

### 4. Pending & Error States

```typescript
// In route definition
pendingComponent: () => PageSkeleton.Full({ statsCount: 2 }),
errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
```

### 5. Search Validation

```typescript
// Always validate search params
validateSearch: validateBatchSearch,
loaderDeps: ({ search }) => ({
  farmId: search.farmId as string | undefined,
  // Type-safe search param extraction
}),
```

## Migration Guide

### For New Routes:

1. Create route file with minimal configuration
2. Create corresponding page component in `route-pages/`
3. Create the matching `.lazy.tsx` file and put the UI there
4. Follow naming conventions

### For Existing Routes:

1. **Extract UI logic** from route file to new page component
2. **Keep router config** in route file (loaders, validation, etc.)
3. **Move `component`, `pendingComponent`, `errorComponent`, and `notFoundComponent` into the matching `.lazy.tsx` file**
4. **Update imports** in page component to use `getRouteApi()`

### Example Migration:

**Before** (inline component):

```typescript
export const Route = createFileRoute('/_auth/user/itemes/')({
  loader: async () => { /* loader logic */ },
  component: () => {
    // 200+ lines of UI logic here
    return <div>Complex UI</div>
  }
})
```

**After** (route-pages pattern):

```typescript
// Route file
export const Route = createFileRoute('/_auth/user/itemes/')({
  loader: async () => { /* same loader logic */ },
  component: BatchesPage, // Import from route-pages
})

// Page component file
export function BatchesPage() {
  const routeApi = getRouteApi('/_auth/user/itemes/')
  const data = routeApi.useLoaderData()
  // 200+ lines of UI logic here
  return <div>Complex UI</div>
}
```

## Benefits

### 1. **Separation of Concerns**

- Routes handle navigation, loading, validation
- Pages handle UI, state, business logic

### 2. **Testability**

- Page components can be tested independently
- Mock route data easily with `getRouteApi`

### 3. **Reusability**

- Page components can be reused in different contexts
- Easier to create Storybook stories

### 4. **Performance**

- Better code splitting opportunities
- Cleaner bundle analysis

### 5. **Developer Experience**

- Cleaner file organization
- Easier to find and modify UI logic
- Better IDE navigation

## Current Status

✅ **Migration Complete**: 128/128 routes use route-pages pattern

### Coverage by Section:

- **Public routes**: ✅ 21/21 migrated
- **Auth layouts**: ✅ 7/7 migrated
- **Farmer routes**: ✅ 67/67 migrated
- **Admin routes**: ✅ 25/25 migrated
- **Extension routes**: ✅ 8/8 migrated

## Verification Commands

```bash
# Count routes vs page components
find app/routes -name "*.tsx" | wc -l
find app/components/route-pages -name "*-page.tsx" | wc -l

# Check for routes without page components
bun scripts/verify-route-pages.mjs

# Verify naming conventions
bun scripts/lint-route-pages.mjs
```

## Anti-Patterns

### ❌ DON'T: Inline complex components

```typescript
export const Route = createFileRoute('/itemes')({
  component: () => {
    // 100+ lines of complex UI logic
    return <ComplexBatchesUI />
  }
})
```

### ❌ DON'T: Mix router logic in page components

```typescript
// In page component - DON'T DO THIS
export function BatchesPage() {
  const navigate = useNavigate() // ❌ Handle navigation in route
  const loader = useLoader() // ❌ Use getRouteApi instead
}
```

### ❌ DON'T: Duplicate route configuration

```typescript
// DON'T duplicate validation or loader logic
export function BatchesPage() {
  const [data, setData] = useState() // ❌ Use loader data instead
  useEffect(() => {
    // ❌ Don't duplicate loader logic
  }, [])
}
```

### ✅ DO: Keep routes thin and focused

```typescript
export const Route = createFileRoute('/itemes')({
  loader: async () => {
    /* minimal loader */
  },
  component: BatchesPage, // Clean import
})
```

## Future Considerations

1. **Automated Migration**: Script to convert inline routes to route-pages pattern
2. **Linting Rules**: ESLint rules to enforce pattern usage
3. **Code Generation**: Templates for new routes following the pattern
4. **Bundle Analysis**: Monitor impact on code splitting and performance
