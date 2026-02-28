---
alwaysApply: true
---

# Neon + Eloquent Rules

1. **Never use raw queries without parameter binding** — always use Eloquent's query builder or `DB::select()` with bindings; never interpolate user input into SQL strings.
2. **Always use database transactions for multi-step writes** — wrap operations that touch more than one table in `DB::transaction()`.
3. **Never run migrations against production without a branch test** — use Neon branching to test migrations before applying to the main branch.
4. **Always define `$fillable` on models** — never use `$guarded = []`; whitelist only the columns that should be mass-assignable.
5. **Never lazy-load relations in loops** — always eager-load with `with()` to prevent N+1 queries.
6. **Never expose raw database exceptions to API responses** — catch `QueryException` and return structured error responses.
