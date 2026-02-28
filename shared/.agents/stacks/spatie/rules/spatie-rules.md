---
alwaysApply: true
---

# Spatie Permissions Rules

1. **Always check permissions at the service layer** — never rely solely on middleware or route-level checks for business-critical operations.
2. **Never use `withoutPermission` or `setPermissionsTeamId(null)` to bypass checks** — if a bypass is needed, it must be explicitly reviewed and documented.
3. **Always seed roles and permissions via migrations or seeders** — never create roles/permissions in application code at runtime.
4. **Never check roles directly when a permission exists** — prefer `can('edit posts')` over `hasRole('editor')`; roles are groupings, permissions are the contract.
5. **Always cache permission lookups** — use `php artisan permission:cache-reset` in deployment; never disable the cache in production.
