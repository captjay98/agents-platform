---
name: feature-structure
description: Feature-first directory organization for TanStack Start — file naming conventions, layer separation, and client/server split. Use when creating a new feature or refactoring existing code.
---

# Feature Structure

Feature-first organization. Each feature is self-contained with clear layer separation.

## Directory Layout (CRITICAL)

```
app/features/
├── orders/
│   ├── orders.functions.ts          # Transport: createServerFn handlers
│   ├── application.server.ts        # Application: orchestration, business rules
│   ├── domain.ts                    # Domain: pure functions, calculations
│   ├── repository.server.ts         # Repository: Kysely database CRUD
│   ├── validation.ts                # Zod input schemas
│   ├── mutations.ts                 # Client: TanStack Query mutation hooks
│   ├── queries.ts                   # Client: TanStack Query query hooks
│   ├── types.ts                     # TypeScript interfaces
│   ├── constants.ts                 # Feature constants and enums
│   └── index.ts                     # Public exports
├── orders-complex/                  # Complex feature with server/ subdirectory
│   ├── orders-complex.functions.ts
│   ├── validation.ts
│   ├── mutations.ts
│   ├── queries.ts
│   ├── types.ts
│   └── server/
│       ├── order-crud.application.server.ts
│       ├── order-crud.repository.server.ts
│       ├── order-fulfillment.application.server.ts
│       └── order-fulfillment.repository.server.ts
└── shared/
    ├── auth/                        # Auth middleware, session, permissions
    ├── utils/                       # error-boundary.server, mutation-safety
    └── providers/                   # Payment provider registry, integrations
```

## File Naming (CRITICAL)

| File | Purpose | Suffix |
|------|---------|--------|
| `{feature}.functions.ts` | Server function entry points | None (imports .server files dynamically) |
| `application.server.ts` | Business logic orchestration | `.server.ts` required |
| `domain.ts` | Pure functions | None (shared client/server) |
| `repository.server.ts` | Database operations | `.server.ts` required |
| `validation.ts` | Zod schemas | None (shared client/server) |
| `mutations.ts` | `useMutation` hooks | None (client-only) |
| `queries.ts` | `useQuery`/`useSuspenseQuery` hooks | None (client-only) |
| `types.ts` | TypeScript interfaces | None (shared) |

The `.server.ts` suffix is mandatory for server-only code — TanStack Start tree-shakes these from the client bundle.

## Client-Side Hooks (HIGH)

### queries.ts

```typescript
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { getOrdersFn, getOrderByIdFn } from './orders.functions'

export const ordersQueryOptions = (filters: OrderFilters) =>
  queryOptions({
    queryKey: ['orders', filters],
    queryFn: () => getOrdersFn({ data: filters }),
  })

export function useOrders(filters: OrderFilters) {
  return useSuspenseQuery(ordersQueryOptions(filters))
}
```

### mutations.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrderFn } from './orders.functions'

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrderInput) => createOrderFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

## Route Pages (MEDIUM)

Page components live in `app/routes/` or `app/route-pages/`:

```
app/routes/
├── orders/
│   ├── index.tsx              # List page
│   └── $orderId.tsx           # Detail page
app/route-pages/
├── orders/
│   ├── OrderListPage.tsx      # Complex page component (extracted from route)
│   └── OrderDetailPage.tsx
```

## Rules

- One `.functions.ts` file per feature — all server functions for that feature
- `validation.ts` is shared between client (form validation) and server (input validation)
- `mutations.ts` and `queries.ts` are client-only — never import `.server.ts` files
- Use `server/` subdirectory when a feature has 3+ application/repository pairs
- `domain.ts` must have zero side effects — no database, no auth, no logging
- Always invalidate relevant query keys in mutation `onSuccess`
