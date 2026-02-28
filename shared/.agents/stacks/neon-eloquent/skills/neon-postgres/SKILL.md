---
name: neon-postgres
description: Connecting to and working with Neon Serverless Postgres — connection methods, branching, pooling, and CLI. Use for any Neon-related setup or configuration.
---

# Neon Postgres

Adapted from neondatabase/agent-skills. Neon is serverless Postgres with autoscaling, branching, and scale-to-zero.

## Connection Setup (CRITICAL)

### Install Driver

```bash
npm install @neondatabase/serverless
```

### Connection String

```typescript
// .env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
# For pooled connections (serverless/edge):
DATABASE_URL_POOLED="postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

### With Kysely (Recommended)

```typescript
// lib/db.ts
import { Kysely } from 'kysely'
import { NeonDialect } from 'kysely-neon'
import type { Database } from './types'

export const db = new Kysely<Database>({
  dialect: new NeonDialect({
    connectionString: process.env.DATABASE_URL!,
  }),
})
```

### Direct Neon Serverless (Edge/Serverless)

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// HTTP-based query (no persistent connection — ideal for edge)
const posts = await sql`SELECT * FROM posts WHERE status = 'published'`
```

## Connection Pooling (CRITICAL)

Use pooled connections in serverless environments to avoid exhausting Postgres connection limits:

```typescript
// Use -pooler hostname for serverless/edge
// DATABASE_URL_POOLED has -pooler in the hostname

// With Kysely — use pooled URL
export const db = new Kysely<Database>({
  dialect: new NeonDialect({
    connectionString: process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL!,
  }),
})
```

## Branching (HIGH)

Branches are instant copy-on-write clones — use for preview deployments and migration testing:

```bash
# Install CLI
npm install -g neonctl

# Create a branch for a PR
neonctl branches create --name preview/pr-123 --parent main

# Get connection string for the branch
neonctl connection-string preview/pr-123

# Delete branch after PR merges
neonctl branches delete preview/pr-123
```

```typescript
// In CI — create branch, run migrations, test, delete
const branch = await neonClient.createProjectBranch(projectId, {
  branch: { name: `ci/${process.env.GITHUB_SHA}` },
  endpoints: [{ type: 'read_write' }],
})
```

## Scale to Zero (HIGH)

Neon computes suspend after 5 minutes of inactivity (configurable). First query after suspend has a cold-start penalty (~100-500ms).

```typescript
// Mitigate cold starts — keep-alive ping for critical paths
// Or disable scale-to-zero on production compute (paid plans)

// Handle connection errors with retry
async function queryWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0 && isConnectionError(error)) {
      await new Promise(r => setTimeout(r, 500))
      return queryWithRetry(fn, retries - 1)
    }
    throw error
  }
}
```

## Neon CLI (MEDIUM)

```bash
# Authenticate
neonctl auth

# List projects
neonctl projects list

# Create project
neonctl projects create --name my-app --region-id aws-us-east-2

# List branches
neonctl branches list --project-id <id>

# Run SQL
neonctl sql --project-id <id> --branch main -- "SELECT count(*) FROM users"

# Get connection string
neonctl connection-string --project-id <id> --branch main
```

## Read Replicas (MEDIUM)

```typescript
// Separate read and write connections
export const dbWrite = new Kysely<Database>({
  dialect: new NeonDialect({ connectionString: process.env.DATABASE_URL! }),
})

export const dbRead = new Kysely<Database>({
  dialect: new NeonDialect({ connectionString: process.env.DATABASE_URL_REPLICA! }),
})

// Use read replica for queries, write connection for mutations
const posts = await dbRead.selectFrom('posts').selectAll().execute()
await dbWrite.insertInto('posts').values(newPost).execute()
```

## Rules

- Always use pooled connections in serverless/edge environments
- Always use `sslmode=require` in connection strings
- Use branching for preview deployments — never share production database with staging
- Fetch current Neon docs at `https://neon.com/docs/llms.txt` for up-to-date API info
