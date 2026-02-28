---
name: kysely-queries
description: Type-safe SQL query building with Kysely — selects, joins, inserts, updates, transactions, and repository patterns. Use when writing database queries.
---

# Kysely Queries

Type-safe SQL query builder. Provides compile-time SQL validation and full TypeScript inference.

## Database Types (CRITICAL)

Define your schema as TypeScript interfaces — Kysely infers all query types from this:

```typescript
// lib/db/types.ts
import type { Generated, ColumnType } from 'kysely'

export interface Database {
  users: UsersTable
  posts: PostsTable
  comments: CommentsTable
  tags: TagsTable
  post_tags: PostTagsTable
}

export interface UsersTable {
  id: Generated<string>
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>  // Can't insert, can update
}

export interface PostsTable {
  id: Generated<string>
  user_id: string
  title: string
  content: string
  status: 'draft' | 'published' | 'archived'
  published_at: Date | null
  created_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>
}
```

## Type Helpers (CRITICAL)

```typescript
import type { Insertable, Selectable, Updateable } from 'kysely'
import type { PostsTable } from './types'

type Post = Selectable<PostsTable>          // All columns, Generated resolved
type NewPost = Insertable<PostsTable>       // Generated columns optional
type PostUpdate = Updateable<PostsTable>    // All columns optional
```

## Select Queries (HIGH)

```typescript
// Explicit columns (preferred over selectAll)
const posts = await db
  .selectFrom('posts')
  .select(['id', 'title', 'status', 'published_at'])
  .where('status', '=', 'published')
  .orderBy('published_at', 'desc')
  .limit(20)
  .offset((page - 1) * 20)
  .execute()

// Single row
const post = await db
  .selectFrom('posts')
  .selectAll()
  .where('id', '=', postId)
  .executeTakeFirst()  // undefined if not found

const post = await db
  .selectFrom('posts')
  .selectAll()
  .where('id', '=', postId)
  .executeTakeFirstOrThrow()  // throws if not found
```

## Joins (HIGH)

```typescript
const postsWithAuthor = await db
  .selectFrom('posts')
  .innerJoin('users', 'users.id', 'posts.user_id')
  .leftJoin('post_tags', 'post_tags.post_id', 'posts.id')
  .leftJoin('tags', 'tags.id', 'post_tags.tag_id')
  .select([
    'posts.id',
    'posts.title',
    'posts.status',
    'users.name as author_name',
    'users.email as author_email',
  ])
  .where('posts.status', '=', 'published')
  .execute()
```

## Insert (HIGH)

```typescript
// Single insert with returning
const post = await db
  .insertInto('posts')
  .values({
    user_id: userId,
    title: data.title,
    content: data.content,
    status: 'draft',
  })
  .returningAll()
  .executeTakeFirstOrThrow()

// Bulk insert
await db
  .insertInto('post_tags')
  .values(tagIds.map(tagId => ({ post_id: postId, tag_id: tagId })))
  .execute()
```

## Update (HIGH)

```typescript
const updated = await db
  .updateTable('posts')
  .set({
    title: data.title,
    content: data.content,
    updated_at: new Date(),
  })
  .where('id', '=', postId)
  .where('user_id', '=', userId)  // Ownership check in query
  .returningAll()
  .executeTakeFirst()

if (!updated) throw new NotFoundError('Post not found or not owned by user')
```

## Complex Filters (HIGH)

```typescript
import { sql } from 'kysely'

// OR conditions
const posts = await db
  .selectFrom('posts')
  .selectAll()
  .where((eb) => eb.or([
    eb('title', 'ilike', `%${search}%`),
    eb('content', 'ilike', `%${search}%`),
  ]))
  .where('status', '=', 'published')
  .execute()

// Dynamic filters
let query = db.selectFrom('posts').selectAll()
if (filters.status) query = query.where('status', '=', filters.status)
if (filters.userId) query = query.where('user_id', '=', filters.userId)
if (filters.search) query = query.where('title', 'ilike', `%${filters.search}%`)
const posts = await query.orderBy('created_at', 'desc').execute()
```

## Aggregations (MEDIUM)

```typescript
const stats = await db
  .selectFrom('posts')
  .select([
    sql<number>`count(*)`.as('total'),
    sql<number>`count(*) filter (where status = 'published')`.as('published'),
    sql<number>`count(*) filter (where status = 'draft')`.as('drafts'),
  ])
  .where('user_id', '=', userId)
  .executeTakeFirstOrThrow()
```

## Transactions (MEDIUM)

```typescript
await db.transaction().execute(async (trx) => {
  const post = await trx
    .insertInto('posts')
    .values(postData)
    .returningAll()
    .executeTakeFirstOrThrow()

  if (tagIds.length > 0) {
    await trx
      .insertInto('post_tags')
      .values(tagIds.map(tagId => ({ post_id: post.id, tag_id: tagId })))
      .execute()
  }

  return post
})
```

## Repository Pattern (MEDIUM)

```typescript
// features/posts/repository.ts
export async function insertPost(db: Kysely<Database>, data: NewPost): Promise<Post> {
  return db.insertInto('posts').values(data).returningAll().executeTakeFirstOrThrow()
}

export async function getPostById(db: Kysely<Database>, id: string): Promise<Post | undefined> {
  return db.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst()
}

export async function getPosts(db: Kysely<Database>, filters: PostFilters): Promise<Post[]> {
  let query = db.selectFrom('posts').selectAll()
  if (filters.status) query = query.where('status', '=', filters.status)
  return query.orderBy('created_at', 'desc').limit(filters.limit ?? 50).execute()
}
```

## Rules

- Always use explicit column selects — avoid `selectAll()` in production queries
- Always use `executeTakeFirstOrThrow()` when the row must exist
- Always pass `db` as a parameter to repository functions — enables transaction support
- Never use raw string interpolation in queries — always use Kysely's parameterized API
