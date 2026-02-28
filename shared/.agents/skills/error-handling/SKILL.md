---
name: error-handling
description: Structured error handling with typed error classes — error codes, HTTP status mapping, and consistent error propagation. Use when implementing error handling in any application.
---

# Error Handling

Typed, structured errors with consistent HTTP status mapping and metadata.

## AppError Class (CRITICAL)

```typescript
// lib/errors/app-error.ts
type ErrorCategory = 'validation' | 'auth' | 'not_found' | 'conflict' | 'database' | 'external'

interface ErrorDefinition {
  httpStatus: number
  category: ErrorCategory
  message: string
}

const ERROR_MAP: Record<string, ErrorDefinition> = {
  VALIDATION_ERROR:   { httpStatus: 400, category: 'validation', message: 'Validation failed' },
  UNAUTHORIZED:       { httpStatus: 401, category: 'auth',       message: 'Authentication required' },
  FORBIDDEN:          { httpStatus: 403, category: 'auth',       message: 'Access denied' },
  NOT_FOUND:          { httpStatus: 404, category: 'not_found',  message: 'Resource not found' },
  CONFLICT:           { httpStatus: 409, category: 'conflict',   message: 'Resource already exists' },
  DATABASE_ERROR:     { httpStatus: 500, category: 'database',   message: 'Database operation failed' },
  EXTERNAL_ERROR:     { httpStatus: 502, category: 'external',   message: 'External service error' },
}

export class AppError extends Error {
  readonly reason: string
  readonly httpStatus: number
  readonly category: ErrorCategory
  readonly metadata: Record<string, unknown>

  constructor(
    reason: keyof typeof ERROR_MAP,
    options: { message?: string; metadata?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    const def = ERROR_MAP[reason]
    super(options.message ?? def.message)
    this.reason = reason
    this.httpStatus = def.httpStatus
    this.category = def.category
    this.metadata = options.metadata ?? {}
    if (options.cause) this.cause = options.cause
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError
  }

  toJSON() {
    return {
      reason: this.reason,
      message: this.message,
      httpStatus: this.httpStatus,
      category: this.category,
      metadata: this.metadata,
    }
  }
}
```

## Throwing Errors (CRITICAL)

```typescript
// Not found
const post = await getPostById(db, postId)
if (!post) {
  throw new AppError('NOT_FOUND', { metadata: { postId } })
}

// Auth
if (!session) {
  throw new AppError('UNAUTHORIZED')
}
if (post.userId !== session.user.id) {
  throw new AppError('FORBIDDEN', { metadata: { postId, userId: session.user.id } })
}

// Validation
const error = validatePostData(data)
if (error) {
  throw new AppError('VALIDATION_ERROR', { message: error, metadata: { field: 'content' } })
}

// Conflict
const existing = await getPostBySlug(db, slug)
if (existing) {
  throw new AppError('CONFLICT', { message: 'Slug already in use', metadata: { slug } })
}
```

## Error Propagation (HIGH)

```typescript
// Wrap unknown errors — preserve known AppErrors
async function createPost(data: CreatePostInput): Promise<Post> {
  try {
    return await insertPost(db, data)
  } catch (error) {
    if (AppError.isAppError(error)) {
      throw error  // Re-throw known errors unchanged
    }
    // Wrap unknown errors
    throw new AppError('DATABASE_ERROR', {
      message: 'Failed to create post',
      cause: error,
    })
  }
}
```

## HTTP Response Mapping (HIGH)

```typescript
// Express/NestJS global error handler
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (AppError.isAppError(error)) {
    return res.status(error.httpStatus).json({
      error: error.reason,
      message: error.message,
    })
  }

  // Unknown error — don't leak details
  console.error('Unhandled error:', error)
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
})

// TanStack Start — errors are serialized automatically
// AppError.toJSON() is called when crossing the server/client boundary
```

## Client-Side Handling (HIGH)

```typescript
// React Query mutation
const createPost = useMutation({
  mutationFn: createPostFn,
  onError: (error) => {
    const message = error instanceof Error ? error.message : 'Something went wrong'

    if (error.message.includes('CONFLICT')) {
      toast.error('A post with this title already exists')
    } else if (error.message.includes('VALIDATION_ERROR')) {
      toast.error('Please check your input')
    } else if (error.message.includes('FORBIDDEN')) {
      toast.error('You do not have permission to do this')
    } else {
      toast.error(message)
    }
  },
})
```

## Logging (MEDIUM)

```typescript
// Always log with context — never just the message
function logError(error: unknown, context: Record<string, unknown> = {}) {
  if (AppError.isAppError(error)) {
    console.error(JSON.stringify({
      level: 'error',
      reason: error.reason,
      message: error.message,
      category: error.category,
      metadata: { ...error.metadata, ...context },
    }))
  } else {
    console.error(JSON.stringify({
      level: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    }))
  }
}
```

## Rules

- Always use `AppError` for known error conditions — never throw raw `Error` with string messages
- Always re-throw `AppError` unchanged — only wrap unknown errors
- Never leak internal error details to clients — map to user-friendly messages
- Always include `metadata` with relevant IDs for debugging
- Never catch errors silently — always log or re-throw
