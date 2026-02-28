---
name: kysely-migrations
description: Database schema migrations with Kysely — migration files, running migrations, and schema evolution patterns. Use when changing the database schema.
---

# Kysely Migrations

Schema migrations with Kysely's built-in migration system.

## Setup (CRITICAL)

```bash
npm install kysely @neondatabase/serverless kysely-neon
```

```typescript
// lib/db/migrator.ts
import { Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import path from 'path'
import { db } from './client'

export const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(process.cwd(), 'lib/db/migrations'),
  }),
})
```

```typescript
// scripts/migrate.ts
import { migrator } from '../lib/db/migrator'

const { error, results } = await migrator.migrateToLatest()

results?.forEach(({ migrationName, status }) => {
  if (status === 'Success') console.log(`✓ ${migrationName}`)
  if (status === 'Error') console.error(`✗ ${migrationName}`)
})

if (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}
```

```json
// package.json
{
  "scripts": {
    "db:migrate": "tsx scripts/migrate.ts",
    "db:rollback": "tsx scripts/rollback.ts"
  }
}
```

## Migration Files (CRITICAL)

Files must be named with a timestamp prefix for ordering:

```
lib/db/migrations/
├── 2024-01-01T00:00:00-create-users.ts
├── 2024-01-02T00:00:00-create-posts.ts
├── 2024-01-03T00:00:00-add-post-tags.ts
└── 2024-01-04T00:00:00-add-post-published-at.ts
```

```typescript
// lib/db/migrations/2024-01-01T00:00:00-create-users.ts
import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('email', 'varchar(255)', col => col.notNull().unique())
    .addColumn('name', 'varchar(255)', col => col.notNull())
    .addColumn('role', 'varchar(50)', col => col.notNull().defaultTo('user'))
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('users_email_idx')
    .on('users')
    .column('email')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('users').execute()
}
```

```typescript
// lib/db/migrations/2024-01-02T00:00:00-create-posts.ts
import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('posts')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', col => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('title', 'varchar(255)', col => col.notNull())
    .addColumn('content', 'text', col => col.notNull())
    .addColumn('status', 'varchar(50)', col => col.notNull().defaultTo('draft'))
    .addColumn('published_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // Indexes for common queries
  await db.schema.createIndex('posts_user_id_idx').on('posts').column('user_id').execute()
  await db.schema.createIndex('posts_status_idx').on('posts').column('status').execute()
  await db.schema
    .createIndex('posts_status_published_at_idx')
    .on('posts')
    .columns(['status', 'published_at'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('posts').execute()
}
```

## Additive Migrations (HIGH)

Always prefer additive changes — never destructive in production:

```typescript
// ✅ Add column with default (safe)
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('posts')
    .addColumn('view_count', 'integer', col => col.notNull().defaultTo(0))
    .execute()
}

// ✅ Add index (safe, use CONCURRENTLY in production)
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_title_idx ON posts (title)`.execute(db)
}

// ⚠️ Rename column — requires multi-step migration
// Step 1: Add new column
// Step 2: Backfill data
// Step 3: Update app to use new column
// Step 4: Drop old column (separate migration)
```

## Neon Branching for Migrations (HIGH)

Test migrations on a branch before running on production:

```bash
# Create migration branch
neonctl branches create --name migration-test --parent main

# Get connection string
MIGRATION_URL=$(neonctl connection-string migration-test)

# Run migrations on branch
DATABASE_URL=$MIGRATION_URL npm run db:migrate

# Verify, then run on production
npm run db:migrate

# Delete test branch
neonctl branches delete migration-test
```

## Rules

- Always include both `up` and `down` functions
- Always add indexes in migrations — not as an afterthought
- Use `gen_random_uuid()` for UUID primary keys (Postgres built-in)
- Use `timestamptz` not `timestamp` — always store timezone-aware timestamps
- Never modify existing migration files — create a new migration instead
- Test migrations on a Neon branch before running on production
