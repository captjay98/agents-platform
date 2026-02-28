---
name: observability-patterns
description: Structured logging, error tracking, and correlation IDs for distributed applications. Use when adding observability to server functions, APIs, or background jobs.
---

# Observability Patterns

Structured logging and error tracking for distributed systems.

## Correlation IDs (HIGH)

Every request should have a traceable ID that appears in all logs:

```typescript
// Middleware — generate or propagate request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] as string ?? crypto.randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
})

// Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
    // Pass requestId through context
  }
}
```

## Structured Logging (HIGH)

Always log JSON with context — never plain strings:

```typescript
// ✅ Structured log
console.log(JSON.stringify({
  level: 'info',
  requestId: ctx.requestId,
  action: 'post.created',
  userId: session.user.id,
  postId: post.id,
  duration: Date.now() - startTime,
}))

// ✅ Error log with full context
console.error(JSON.stringify({
  level: 'error',
  requestId: ctx.requestId,
  action: 'post.create.failed',
  error: error.name,
  message: error.message,
  metadata: error instanceof AppError ? error.metadata : {},
  stack: error instanceof Error ? error.stack : undefined,
}))

// ❌ Plain string — unsearchable
console.log('Post created by user ' + userId)
console.error('Error: ' + error.message)
```

## Error Tracking (HIGH)

```typescript
// lib/error-tracking.ts
interface TrackingContext {
  requestId?: string
  userId?: string
  action?: string
  metadata?: Record<string, unknown>
}

export function trackError(error: unknown, context: TrackingContext = {}) {
  const payload = {
    level: 'error',
    timestamp: new Date().toISOString(),
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : String(error),
  }

  // Send to your error tracking service (Sentry, BetterStack, etc.)
  console.error(JSON.stringify(payload))
}

export function trackWarning(message: string, context: TrackingContext = {}) {
  console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...context }))
}

export function trackInfo(message: string, context: TrackingContext = {}) {
  console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...context }))
}
```

## Performance Tracking (MEDIUM)

```typescript
// Track slow operations
async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {},
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    if (duration > 1000) {
      trackWarning(`Slow operation: ${name}`, { duration, ...context })
    }
    return result
  } catch (error) {
    trackError(error, { action: name, ...context })
    throw error
  }
}

// Usage
const posts = await withTiming('posts.list', () => getPosts(filters), { userId })
```

## Background Job Logging (MEDIUM)

```typescript
// Log job lifecycle
async function processJob(job: Job) {
  const ctx = { jobId: job.id, jobType: job.type }

  trackInfo('job.started', ctx)

  try {
    await job.process()
    trackInfo('job.completed', { ...ctx, duration: job.duration })
  } catch (error) {
    trackError(error, { ...ctx, attempt: job.attemptsMade })
    throw error
  }
}
```

## Rules

- Always log JSON — never plain strings (unsearchable in log aggregators)
- Always include `requestId` in logs — enables tracing a request across services
- Never log sensitive data — no passwords, tokens, or PII
- Log at the right level: `error` for failures, `warn` for degraded state, `info` for key events
- Always log errors with full context — not just the message
