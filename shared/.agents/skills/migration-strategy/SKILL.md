---
name: migration-strategy
description: Safe database migration patterns — additive-only changes, zero-downtime deploys, rollback strategies, and data backfills. Use when planning or reviewing schema changes.
---

# Migration Strategy

Safe schema changes that don't break running applications.

## Additive-Only Migrations (CRITICAL)

Always prefer additive changes. Never drop or rename in a single deploy:

```
✅ Safe (single deploy):
  - Add column (nullable or with default)
  - Add table
  - Add index
  - Add enum value

❌ Unsafe (needs multi-step):
  - Drop column
  - Rename column
  - Change column type
  - Remove enum value
```

## Multi-Step Changes (CRITICAL)

For breaking changes, use expand-contract pattern across deploys:

### Rename a column
```
Deploy 1: Add new column, backfill from old, update code to write both
Deploy 2: Update code to read from new column only
Deploy 3: Drop old column
```

### Change column type
```
Deploy 1: Add new column with new type, backfill, write to both
Deploy 2: Switch reads to new column
Deploy 3: Drop old column
```

### Drop a column
```
Deploy 1: Stop reading/writing the column in code
Deploy 2: Drop the column in migration
```

## Zero-Downtime Rules (HIGH)

- Never lock large tables (avoid `ALTER TABLE` that rewrites rows on busy tables)
- Add indexes concurrently when supported (`CREATE INDEX CONCURRENTLY` in Postgres)
- Backfill data in batches, not one massive UPDATE
- Test migrations against a production-size dataset before deploying

## Rollback Strategy (HIGH)

Every migration should be reversible:

```typescript
// Kysely
export async function up(db) {
  await db.schema.alterTable('orders').addColumn('notes', 'text').execute()
}
export async function down(db) {
  await db.schema.alterTable('orders').dropColumn('notes').execute()
}
```

```php
// Laravel
public function up(): void {
    Schema::table('orders', fn (Blueprint $t) => $t->text('notes')->nullable());
}
public function down(): void {
    Schema::table('orders', fn (Blueprint $t) => $t->dropColumn('notes'));
}
```

If a migration is not reversible (data destruction), document it explicitly.

## Data Backfills (MEDIUM)

Backfill in batches to avoid locking and timeouts:

```typescript
// Kysely — batch backfill
const BATCH = 1000
let offset = 0
while (true) {
  const rows = await db.selectFrom('orders')
    .where('status_v2', 'is', null)
    .limit(BATCH).offset(offset)
    .select('id').execute()
  if (rows.length === 0) break
  await db.updateTable('orders')
    .set({ status_v2: sql`status` })
    .where('id', 'in', rows.map(r => r.id))
    .execute()
  offset += BATCH
}
```

```php
// Laravel — batch backfill
Order::whereNull('status_v2')->chunkById(1000, function ($orders) {
    foreach ($orders as $order) {
        $order->update(['status_v2' => $order->status]);
    }
});
```

## Rules

- Additive-only in a single deploy — never drop or rename directly
- Every migration must have a working `down()` or be explicitly marked irreversible
- Backfill in batches (1000 rows) — never one massive UPDATE
- Test on production-size data before deploying
- Run migrations in a transaction when the database supports it
- Never deploy code that depends on a new column before the migration runs
