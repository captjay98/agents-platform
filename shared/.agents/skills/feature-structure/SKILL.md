---
name: feature-structure
description: Organizing features with server/service/repository layers and consistent file conventions. Use when creating a new feature or refactoring existing code.
---

# Feature Structure

Feature-first organization with clear layer separation. Each feature is self-contained.

## Directory Layout (CRITICAL)

```
src/features/
├── posts/
│   ├── server.ts          # Server functions / API handlers (auth, validation, orchestration)
│   ├── service.ts         # Pure business logic (no side effects)
│   ├── repository.ts      # Database operations only
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Feature constants and enums
│   └── index.ts           # Public exports
├── users/
│   └── ...
└── auth/
    ├── server.ts
    ├── middleware.ts      # Auth helpers (requireAuth, getSession)
    ├── repository.ts
    └── types.ts
```

## Layer Responsibilities (CRITICAL)

| Layer | File | Responsibility | Side Effects |
|-------|------|---------------|-------------|
| Server | `server.ts` | Auth, validation, orchestration | Yes (auth, HTTP) |
| Service | `service.ts` | Business logic, calculations | No (pure) |
| Repository | `repository.ts` | Database CRUD | Yes (database) |

## server.ts (CRITICAL)

```typescript
// Handles: auth, input validation, orchestration
// Never: business logic, direct DB queries

export const createPostFn = createServerFn({ method: 'POST' })
  .inputValidator(createPostSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()

    const error = validatePostData(data)  // Delegate to service
    if (error) throw new AppError('VALIDATION_ERROR', { message: error })

    return createPost(db, { ...data, userId: session.user.id })  // Delegate to repository
  })

export const getPostFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const post = await getPostById(db, data.id)
    if (!post) throw new AppError('NOT_FOUND', { metadata: { postId: data.id } })
    return post
  })
```

## service.ts (HIGH)

```typescript
// Pure functions only — no database, no auth, no side effects
// Easy to unit test

export function validatePostData(data: CreatePostInput): string | null {
  if (data.title.length < 3) return 'Title must be at least 3 characters'
  if (data.content.length < 50) return 'Content must be at least 50 characters'
  return null
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}
```

## repository.ts (HIGH)

```typescript
// Database operations only — no business logic, no auth

export async function insertPost(db: Kysely<Database>, data: NewPost): Promise<Post> {
  return db.insertInto('posts').values(data).returningAll().executeTakeFirstOrThrow()
}

export async function getPostById(db: Kysely<Database>, id: string): Promise<Post | undefined> {
  return db.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst()
}

export async function getPosts(db: Kysely<Database>, filters: PostFilters): Promise<Post[]> {
  let query = db.selectFrom('posts').selectAll()
  if (filters.status) query = query.where('status', '=', filters.status)
  if (filters.userId) query = query.where('user_id', '=', filters.userId)
  return query.orderBy('created_at', 'desc').limit(filters.limit ?? 50).execute()
}

export async function updatePost(
  db: Kysely<Database>,
  id: string,
  data: PostUpdate,
): Promise<Post | undefined> {
  return db.updateTable('posts').set(data).where('id', '=', id).returningAll().executeTakeFirst()
}
```

## types.ts (MEDIUM)

```typescript
// TypeScript interfaces for the feature

export interface Post {
  id: string
  userId: string
  title: string
  content: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePostInput {
  title: string
  content: string
  status?: 'draft' | 'published'
  tags?: string[]
}

export interface PostFilters {
  status?: Post['status']
  userId?: string
  search?: string
  limit?: number
}
```

## index.ts (MEDIUM)

```typescript
// Export only what other features need
export { createPostFn, getPostFn, getPostsFn } from './server'
export { generateSlug, calculateReadingTime } from './service'
export type { Post, CreatePostInput, PostFilters } from './types'
// Don't export repository functions — they're internal
```

## Rules

- Never put business logic in `server.ts` — delegate to `service.ts`
- Never put database queries in `service.ts` — delegate to `repository.ts`
- Never export repository functions from `index.ts` — they're internal
- Service functions must be pure — same input = same output, no side effects
- Always validate input in `server.ts` before calling service or repository
