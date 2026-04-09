---
name: observability-patterns
description: Structured logging with ~/lib/logger, Sentry error tracking, and correlation context. Use when adding logging, error tracking, or debugging server functions.
---

# Observability Patterns

Use `~/lib/logger` for all logging. Never use raw `console.log` in production code.

## Logger API (CRITICAL)

```typescript
import { logger } from '~/lib/logger'

// Standard error — logged + sent to Sentry
logger.error('Operation failed: orders.create', error, {
  operation: 'orders.create',
  domain: 'orders',
  severity: 'error',
  recoverable: false,
})

// Recoverable — logged + Sentry breadcrumb (not a full error)
logger.recoverable('Cache miss, using fallback', error, {
  operation: 'orders.list',
  domain: 'orders',
})

// Recoverable but critical — logged + Sentry warning
logger.recoverableCritical('Payment webhook needs retry', error, {
  operation: 'payments.webhook',
  domain: 'payments',
})

// Warning — no Sentry, just structured log
logger.warn('Slow query detected', {
  operation: 'orders.list',
  duration: 5200,
})

// Explicit Sentry capture
logger.captureException(error, {
  operation: 'orders.create',
  domain: 'orders',
  extra: { userId, orderId },
})
```

## Structured Context (CRITICAL)

Every log entry includes:

```typescript
{
  operation: 'feature.subfeature.action',  // Dotted path
  domain: 'feature/subfeature',            // Slash path
  severity: 'error' | 'warning' | 'info',
  recoverable: boolean,
}
```

## Sentry Integration (HIGH)

Sentry is lazily initialized. Server-side uses `~/lib/sentry-server`, client uses `~/lib/sentry`:

```typescript
// Server — lazy init in server.ts entry point
const { initSentry } = await import('~/lib/sentry-server')
initSentry()

// Client — lazy loaded by logger when in browser
// logger automatically detects browser vs server and routes to correct Sentry
```

The logger handles Sentry routing internally — you never call Sentry directly. Just use `logger.*` methods.

## Where to Log (HIGH)

| Layer | Logging? | How |
|-------|----------|-----|
| Transport (`.functions.ts`) | Via `withErrorBoundary` only | Automatic — don't add manual logging |
| Application (`application.server.ts`) | Yes — for business events | `logger.warn`, `logger.recoverable` |
| Domain (`domain.ts`) | Never | Pure functions, no side effects |
| Repository (`repository.server.ts`) | Rarely | Only for unexpected DB states |

## Middleware-First Logging (HIGH)

Wrap all server functions with a single logger middleware in `server.ts`:

```typescript
// lib/middleware/logger.ts
export async function withLogger<T>(request: Request, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  const url = new URL(request.url)
  try {
    const result = await fn()
    logger.info('request.success', { path: url.pathname, duration: Date.now() - start })
    return result
  } catch (error) {
    logger.error('request.failed', error, { path: url.pathname, duration: Date.now() - start })
    throw error
  }
}

// server.ts — apply once, covers ALL server functions
export default {
  async fetch(request: Request, ...args) {
    return withLogger(request, async () => handler(request, ...args))
  },
}
```

## Rules

- Always use `logger` from `~/lib/logger` — never raw `console.log/error`
- Always include `{ operation, domain }` in context
- `withErrorBoundary` handles transport-layer logging — don't duplicate
- Use `logger.recoverable` for degraded-but-functional states
- Use `logger.error` only for unrecoverable failures
- Sentry is lazy-loaded — zero cost if no errors occur
