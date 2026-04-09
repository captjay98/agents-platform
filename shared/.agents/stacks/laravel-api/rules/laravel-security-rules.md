---
alwaysApply: true
---

# Laravel Security Rules

These rules apply to all Laravel code:

1. **Never use `$request->all()`** — always `$request->validated()` after Form Request validation
2. **Never interpolate user input into queries** — always use Eloquent or parameter binding
3. **Never set `$guarded = []`** — always whitelist with `$fillable`
4. **Never store uploaded files in `public/`** — use `private` disk with signed URLs
5. **Always rate-limit auth endpoints** — separate limiter from API limiter
6. **Never log sensitive data** — no passwords, tokens, or full email addresses in logs
7. **Always set token expiry** — `createToken(..., expiresAt: now()->addDays(30))`

7. **Always declare strict types** — every PHP file starts with `declare(strict_types=1)`. Every function has typed parameters and return types.
