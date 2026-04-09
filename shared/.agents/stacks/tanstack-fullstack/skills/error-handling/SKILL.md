---
name: error-handling
description: Structured error handling with AppError, withErrorBoundary transport wrapper, and severity-based logging. Use when implementing error handling in server functions or application logic.
---

# Error Handling

Typed errors with `withErrorBoundary` at the transport layer. Never double-catch.

## AppError Class (CRITICAL)

```typescript
// lib/errors/app-error.ts
type ErrorCategory = 'validation' | 'auth' | 'not_found' | 'conflict' | 'database' | 'external'

const ERROR_MAP = {
  VALIDATION_ERROR: { httpStatus: 400, category: 'validation', message: 'Validation failed' },
  UNAUTHORIZED:     { httpStatus: 401, category: 'auth',       message: 'Authentication required' },
  FORBIDDEN:        { httpStatus: 403, category: 'auth',       message: 'Access denied' },
  NOT_FOUND:        { httpStatus: 404, category: 'not_found',  message: 'Resource not found' },
  CONFLICT:         { httpStatus: 409, category: 'conflict',   message: 'Resource already exists' },
  DATABASE_ERROR:   { httpStatus: 500, category: 'database',   message: 'Database operation failed' },
  EXTERNAL_ERROR:   { httpStatus: 502, category: 'external',   message: 'External service error' },
} as const

export class AppError extends Error {
  readonly reason: string
  readonly httpStatus: number
  readonly category: ErrorCategory
  readonly metadata: Record<string, unknown>

  constructor(reason: keyof typeof ERROR_MAP, options: { message?: string; metadata?: Record<string, unknown>; cause?: unknown } = {}) {
    const def = ERROR_MAP[reason]
    super(options.message ?? def.message)
    this.reason = reason
    this.httpStatus = def.httpStatus
    this.category = def.category
    this.metadata = options.metadata ?? {}
    if (options.cause) this.cause = options.cause
  }
}
```

## withErrorBoundary (CRITICAL)

Every transport handler (`.functions.ts`) wraps with this. It is the ONLY place errors are caught:

```typescript
// features/shared/utils/error-boundary.server.ts
export async function withErrorBoundary<T>(
  operation: string,
  domain: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // Pass through TanStack redirect/notFound control flow
    if (error && typeof error === 'object' &&
        ('__isRedirect' in error || '__isNotFound' in error)) {
      throw error
    }
    logger.error(`Operation failed: ${operation}`, error, {
      operation,
      domain,
      severity: 'error',
      recoverable: false,
    })
    if (error instanceof AppError) throw error
    throw new AppError('DATABASE_ERROR', { cause: error })
  }
}
```

## DO NOT Double-Catch (CRITICAL)

```typescript
// ❌ WRONG — application layer catches and re-throws
export async function createOrderApplication(userId: string, data: Input) {
  try {
    const db = await getDb()
    return await repo.createOrder(db, data)
  } catch (error) {
    logger.error('Failed', error) // Double-logged!
    throw error
  }
}

// ✅ CORRECT — application layer throws, transport catches via withErrorBoundary
export async function createOrderApplication(userId: string, data: Input) {
  const db = await getDb()
  const repo = await getRepo()
  const order = await repo.createOrder(db, data)
  if (!order) throw new AppError('NOT_FOUND', { metadata: { userId } })
  return order
}
```

## Severity Levels (HIGH)

```typescript
// Unrecoverable — operation failed, user sees error
logger.error('Operation failed', error, { operation, domain, severity: 'error', recoverable: false })

// Recoverable — degraded but functional
logger.recoverable('Cache miss, falling back to DB', error, { operation, domain })

// Recoverable critical — needs attention but doesn't block user
logger.recoverableCritical('Payment webhook retry', error, { operation, domain })

// Warning — not an error but worth tracking
logger.warn('Slow query detected', { operation, duration: 5000 })

// Capture to Sentry explicitly
logger.captureException(error, { operation, domain, extra: { userId } })
```

## Throwing Errors (HIGH)

```typescript
// Not found
const order = await repo.getOrderById(db, orderId)
if (!order) throw new AppError('NOT_FOUND', { metadata: { orderId } })

// Auth
const session = await requireAuth()
if (order.userId !== session.user.id) throw new AppError('FORBIDDEN')

// Validation (in application layer)
const error = validateOrderData(data)
if (error) throw new AppError('VALIDATION_ERROR', { message: error })

// External service failure
try {
  await paymentProvider.charge(amount)
} catch (cause) {
  throw new AppError('EXTERNAL_ERROR', { message: 'Payment failed', cause })
}
```

## Rules

- `withErrorBoundary` in transport layer ONLY — never in application or repository
- Application layer throws `AppError` for business rule violations — does NOT catch
- Repository layer lets database errors propagate — `withErrorBoundary` wraps them
- Domain layer never throws `AppError` — returns error strings or null
- Always include `{ operation, domain }` context in error logs
- Never expose raw stack traces to client — `withErrorBoundary` wraps unknown errors
