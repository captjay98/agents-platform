---
alwaysApply: true
---

# Bouncer Rules

1. **Always check abilities at the service layer** — never rely solely on route middleware; re-check authorization inside the service before mutating data.
2. **Never use `Bouncer::allow('role')->to('manage', '*')` outside of admin roles** — wildcard abilities must be explicitly justified and limited to superadmin.
3. **Always use `toOwn()` for ownership-based access** — never manually compare `$user->id === $resource->user_id` when Bouncer's ownership model covers it.
4. **Never check roles directly when an ability exists** — prefer `$user->can('edit', $post)` over `$user->isAn('editor')`; abilities are the contract, roles are groupings.
5. **Always call `Bouncer::refresh()` in tests** — stale permission cache causes false positives/negatives across test cases.
6. **Always seed roles and abilities via seeders** — never create abilities dynamically in application code at runtime.
