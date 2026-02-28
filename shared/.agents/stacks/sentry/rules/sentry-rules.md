---
alwaysApply: true
---

# Sentry Rules

1. **Never use empty catch blocks** — every caught exception must either be re-thrown or captured with `Sentry.captureException(error)`.
2. **Always attach context to captured exceptions** — include relevant IDs (userId, resourceId, operation) via `extra` or `tags`.
3. **Never log success paths** — Sentry is for errors and warnings. Don't capture informational events as exceptions.
4. **Always use `Sentry.logger` for structured logs** — prefer structured key-value logging over string concatenation.
5. **Never swallow errors silently after capture** — capturing an error does not replace handling it; re-throw or return an error response.
6. **Always set environment and release** — `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` must be configured in all deployment environments.
