---
alwaysApply: true
---

# Neon + Kysely Rules

1. **Never use raw string interpolation in queries** — always use Kysely's parameterized query builder; never concatenate user input into SQL.
2. **Always use transactions for multi-step writes** — wrap any operation that writes to more than one table in `db.transaction().execute()`.
3. **Always use dynamic imports for DB modules in Cloudflare Workers** — `await import('./db')` inside server functions; static top-level imports crash at the edge.
4. **Never run migrations against the production branch directly** — use Neon branching; test migrations on a branch before applying to main.
5. **Always select only needed columns** — never `selectAll()` when a subset of columns is sufficient; avoid over-fetching.
6. **Never expose raw database errors to the client** — catch and log DB errors server-side, return safe error messages to users.
