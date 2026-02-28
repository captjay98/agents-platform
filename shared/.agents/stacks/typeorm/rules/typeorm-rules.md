---
alwaysApply: true
---

# TypeORM Rules

1. **Always use transactions for multi-step writes** — any operation that writes to more than one table must be wrapped in a `QueryRunner` transaction.
2. **Never use raw queries without parameterization** — always use TypeORM's parameter binding; never interpolate user input into query strings.
3. **Always define explicit column types** — never rely on TypeORM's type inference for production columns; specify `type`, `length`, and `nullable` explicitly.
4. **Never use `synchronize: true` in production** — schema changes must go through migrations only.
5. **Always use `select` to limit returned columns** — never return full entities when only a subset of fields is needed.
6. **Never load relations eagerly by default** — use explicit `relations` in `find` options or `leftJoinAndSelect` in query builders.
