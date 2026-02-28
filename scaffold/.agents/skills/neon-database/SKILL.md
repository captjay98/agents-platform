---
name: neon-database
description: Neon MCP setup, inspection, and debugging patterns
---

# Neon Database

## Core Position

Neon MCP is a **support/inspection tool**, not the primary schema-change executor.

- Execute schema changes through project migration tooling (repo is source of truth).
- Use Neon MCP to inspect, validate, and troubleshoot before/after changes.

## Safe Operations (via MCP)

- Inspect schema, tables, indexes
- Run read-only diagnostic queries
- Check connection pool status
- Verify migration results

## Unsafe (use project tooling instead)

- Schema migrations
- Data mutations
- Index creation on production

<!-- PROJECT: Your migration commands and ORM setup -->

## Decision Guide

**Use when:**
- Inspecting database state or schema
- Debugging query performance
- Verifying migration results
- Checking connection pool health

**Don't use when:**
- Making schema changes (use migration tooling)
- Mutating production data
- Creating indexes (use migrations)

**Decision tree:**
- Need to check schema? → Neon MCP `describe_table`
- Need to change schema? → Project migration tool
- Slow query? → Neon MCP `EXPLAIN ANALYZE`
- Connection issues? → Check pool settings and branch status

**Failure modes:**
- Schema changes via MCP → not tracked in migrations, drift
- Direct data mutations → no audit trail, no rollback
- Forgetting to branch → testing against production data
