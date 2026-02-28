---
name: tanstack-three-layer-arch
description: Server → Service → Repository pattern for feature organization in TanStack Start apps. Use when structuring full-stack features.
---

# Three-Layer Architecture

Separation of concerns pattern for TanStack Start features: Server (orchestration) → Service (business logic) → Repository (data access).

## Layer Structure

```
app/features/{feature}/
├── server.ts       # Auth, validation, orchestration (createServerFn)
├── service.ts      # Pure business logic, calculations
├── repository.ts   # Database CRUD operations
├── types.ts        # TypeScript interfaces
└── index.ts        # Public exports
```

## Layer Responsibilities

| Layer | Responsibility | Side Effects | Testability |
|-------|---------------|-------------|-------------|
| Server | Auth, input validation, orchestration | Yes (auth, HTTP) | Integration tests |
| Service | Business logic, calculations, rules | No (pure functions) | Unit tests (easy) |
| Repository | Database CRUD, query building | Yes (database) | Integration tests |

## Server Layer (`server.ts`)

Handles authentication, input validation, and orchestrates service/repository calls:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { validateItemData } from './service'
import { insertItem, getItemById } from './repository'

export const createItemFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().int().positive(),
    categoryId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    // 1. Auth
    const session = await requireAuth()

    // 2. Business logic validation
    const error = validateItemData(data)
    if (error) throw new AppError('VALIDATION_ERROR', { metadata: { error } })

    // 3. Persist
    return await insertItem({ ...data, ownerId: session.userId })
  })

export const getItemFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const item = await getItemById(data.id)
    if (!item) throw notFound()
    return item
  })
```

## Service Layer (`service.ts`)

Pure business logic — no database, no auth, no side effects. Easy to unit test:

```typescript
import type { CreateItemInput, Item } from './types'

export function validateItemData(data: CreateItemInput): string | null {
  if (data.quantity > 10000) return 'Quantity exceeds maximum allowed'
  if (data.name.includes('test')) return 'Invalid item name'
  return null
}

export function calculateItemValue(item: Item, unitPrice: number): number {
  return item.quantity * unitPrice
}

export function canDeleteItem(item: Item, userId: string): boolean {
  return item.ownerId === userId && item.status !== 'locked'
}
```

## Repository Layer (`repository.ts`)

Database operations only — no business logic:

```typescript
import type { CreateItemInput, Item, ItemFilters } from './types'

export async function insertItem(data: CreateItemInput & { ownerId: string }): Promise<Item> {
  const db = await getDb()
  return db.insertInto('items').values(data).returningAll().executeTakeFirstOrThrow()
}

export async function getItemById(id: string): Promise<Item | undefined> {
  const db = await getDb()
  return db.selectFrom('items').selectAll().where('id', '=', id).executeTakeFirst()
}

export async function getItems(filters: ItemFilters): Promise<Item[]> {
  const db = await getDb()
  let query = db.selectFrom('items').selectAll()
  if (filters.categoryId) query = query.where('categoryId', '=', filters.categoryId)
  if (filters.status) query = query.where('status', '=', filters.status)
  return query.orderBy('createdAt', 'desc').limit(filters.limit ?? 50).execute()
}
```

## Rules

1. **Server never contains business logic** — delegate to service
2. **Service never touches the database** — delegate to repository
3. **Repository never validates business rules** — just CRUD
4. **Server always validates input** — Zod schemas on every server function
5. **Server always checks auth** — before any data access
6. **Service functions are pure** — same input = same output, no side effects
