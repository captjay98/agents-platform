---
description: 'Database migration workflow — plan, review, execute, verify'
---

@backend-engineer Run migration workflow for: $ARGUMENTS

## Protocol

1. **Plan**: Review pending migrations. Check for destructive changes (column drops, renames, type changes).
2. **Safety check**: Verify migrations are additive-only for single-deploy. Flag any that need expand-contract pattern.
3. **Backup**: Confirm backup strategy before applying to production.
4. **Execute**: Run migrations in the correct environment.
5. **Verify**: Confirm schema matches expectations. Run smoke tests on affected queries.
6. **Rollback plan**: Confirm `down()` migrations work if needed.

## Rules

- Never drop or rename columns in a single deploy — use expand-contract
- Backfill data in batches (1000 rows), never one massive UPDATE
- Test migrations against production-size data before deploying
- Always have a working rollback path
