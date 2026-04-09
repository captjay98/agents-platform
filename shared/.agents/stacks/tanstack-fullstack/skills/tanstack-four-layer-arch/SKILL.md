---
name: tanstack-four-layer-arch
description: Four-layer feature architecture for TanStack Start — Transport (.functions.ts) → Application (application.server.ts) → Domain (domain.ts) → Repository (repository.server.ts). Use when creating or modifying features.
---

# Four-Layer Feature Architecture

Every feature follows Transport → Application → Domain → Repository. The `.server.ts` suffix is critical for TanStack Start tree-shaking.

## Layers (CRITICAL)

| Layer | File | Responsibility | Side Effects |
|-------|------|---------------|-------------|
| Transport | `{feature}.functions.ts` | `createServerFn`, auth, input validation, `withErrorBoundary` | Yes (HTTP, auth) |
| Application | `application.server.ts` | Orchestration, business rules, transactions, audit logging | Yes (DB, events) |
| Domain | `domain.ts` | Pure functions, calculations, state derivation | No |
| Repository | `repository.server.ts` | Kysely database CRUD only | Yes (database) |

## Transport — `.functions.ts` (CRITICAL)

Entry point for all server functions. Uses `withErrorBoundary` and dynamic imports:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { createOrderSchema } from './validation'

export const createOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }) => {
    const { withErrorBoundary } =
      await import('~/features/shared/utils/error-boundary.server')
    return withErrorBoundary('orders.create', 'orders', async () => {
      const { requireAuth } =
        await import('~/features/shared/auth/session/auth-middleware.server')
      const session = await requireAuth()
      const { createOrderApplication } = await import('./application.server')
      return await createOrderApplication(session.user.id, data)
    })
  })
```

Rules for transport:
- Always wrap with `withErrorBoundary(operation, domain, fn)`
- Always use dynamic `await import()` for application/repository modules
- Auth via `requireAuth()` — never pass raw session data to client
- Input validation via Zod schemas from `validation.ts`
- DO NOT catch errors here — `withErrorBoundary` handles it

## Application — `application.server.ts` (CRITICAL)

Orchestrates business logic. Calls domain for calculations, repository for data:

```typescript
import { AppError } from '~/lib/errors'
import { logger } from '~/lib/logger'
import { calculateOrderTotal } from './domain'

async function getDb() {
  const { getDb } = await import('~/lib/db')
  return getDb()
}

async function getRepo() {
  return import('./repository.server')
}

export async function createOrderApplication(userId: string, data: CreateOrderInput) {
  const [db, repo] = await Promise.all([getDb(), getRepo()])

  const items = await repo.getProductsByIds(db, data.productIds)
  if (items.length !== data.productIds.length) {
    throw new AppError('NOT_FOUND', { message: 'Some products not found' })
  }

  const total = calculateOrderTotal(items, data.quantities) // domain logic
  return await repo.createOrder(db, { userId, items, total })
}
```

## Domain — `domain.ts` (HIGH)

Pure functions only. No database, no auth, no side effects. Easy to unit test:

```typescript
export function calculateOrderTotal(
  items: Array<{ price: number }>,
  quantities: Map<string, number>,
): number {
  return items.reduce((sum, item) => {
    const qty = quantities.get(item.id) ?? 0
    return sum + item.price * qty
  }, 0)
}

export function validateOrderData(data: CreateOrderInput): string | null {
  if (data.quantities.some(q => q <= 0)) return 'Quantities must be positive'
  return null
}
```

## Repository — `repository.server.ts` (HIGH)

Database CRUD only. No business logic, no auth decisions:

```typescript
import type { Kysely } from 'kysely'
import type { Database } from '~/lib/db/types'

export async function createOrder(
  db: Kysely<Database>,
  data: { userId: string; items: OrderItem[]; total: number },
) {
  return db.insertInto('orders')
    .values({ userId: data.userId, total: data.total, status: 'pending' })
    .returningAll()
    .executeTakeFirstOrThrow()
}
```

## Client-Side Files (HIGH)

```
features/orders/
├── orders.functions.ts          # Transport (server functions)
├── application.server.ts        # Application logic
├── domain.ts                    # Pure business logic
├── repository.server.ts         # Database CRUD
├── validation.ts                # Zod schemas
├── mutations.ts                 # TanStack Query mutation hooks
├── queries.ts                   # TanStack Query query hooks
├── types.ts                     # TypeScript interfaces
├── constants.ts                 # Feature constants
└── server/                      # Subdirectory for complex features
    ├── order-crud.application.server.ts
    └── order-crud.repository.server.ts
```

## Rules

- `.server.ts` suffix on all server-only files — required for tree-shaking
- Dynamic `await import()` in transport and application layers — critical for Workers bundle size
- `withErrorBoundary` wraps every transport handler — DO NOT double-catch
- Domain layer has zero imports from `~/lib/db`, `~/lib/auth`, or any `.server.ts` file
- Repository receives `db: Kysely<Database>` as first argument — never imports db directly
- Use `server/` subdirectory when a feature has multiple CRUD groups
