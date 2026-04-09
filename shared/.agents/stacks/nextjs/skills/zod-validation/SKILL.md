---
name: zod-validation
description: Runtime input validation with Zod — schemas, common patterns, and reusable validators. Use when validating user input, API payloads, or server function arguments.
---

# Zod Validation

Runtime type-safe validation with Zod. Catches invalid input at the boundary before it reaches business logic.

## Basic Schema (CRITICAL)

```typescript
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(10),
  status: z.enum(['draft', 'published']),
  categoryId: z.string().uuid(),
  tags: z.array(z.string().uuid()).max(10).optional(),
  publishedAt: z.coerce.date().optional(),
})

// Infer TypeScript type from schema
type CreatePostInput = z.infer<typeof createPostSchema>
```

## Common Patterns (CRITICAL)

### Strings

```typescript
name: z.string().min(1).max(100)
email: z.string().email()
url: z.string().url()
slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
notes: z.string().max(500).nullish()  // undefined or null
```

### Numbers

```typescript
page: z.number().int().positive()
quantity: z.number().int().positive()
amount: z.number().nonnegative()
percentage: z.number().min(0).max(100)
rating: z.number().int().min(1).max(5)
```

### IDs and Dates

```typescript
id: z.string().uuid()
optionalId: z.string().uuid().optional()
date: z.coerce.date()  // Accepts string, number, or Date
optionalDate: z.coerce.date().optional()
```

### Optional vs Nullable

```typescript
// Optional — can be undefined (omitted from object)
notes: z.string().optional()

// Nullable — can be null
notes: z.string().nullable()

// Both — can be undefined or null
notes: z.string().nullish()
```

## Pagination Schema (HIGH)

```typescript
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
```

## Reusable Validators (HIGH)

```typescript
// Shared validators
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email().toLowerCase()
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const passwordSchema = z.string().min(8).max(100)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number')

// Compose schemas
export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
})

export const updateUserSchema = createUserSchema.partial()  // All fields optional
```

## Transform and Refine (HIGH)

```typescript
const createPostSchema = z.object({
  title: z.string().min(1).max(255)
    .transform(val => val.trim()),  // Trim whitespace
  email: z.string().email()
    .transform(val => val.toLowerCase()),  // Normalize
  tags: z.array(z.string()).transform(tags => [...new Set(tags)]),  // Deduplicate
})

// Cross-field validation
const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  data => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
)
```

## Server Action Validation (MEDIUM)

```typescript
// Next.js Server Action
'use server'

export async function createPost(formData: FormData) {
  const result = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    status: formData.get('status'),
  })
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }
  // result.data is typed and validated
}

// Next.js API Route
export async function POST(request: Request) {
  const body = await request.json()
  const result = createPostSchema.safeParse(body)
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 422 })
  }
  // result.data is typed and validated
}
```

## Error Handling (MEDIUM)

```typescript
// safeParse — doesn't throw
const result = schema.safeParse(input)
if (!result.success) {
  const errors = result.error.flatten()
  // errors.fieldErrors: { title: ['Required'], email: ['Invalid email'] }
  // errors.formErrors: ['...']
}

// parse — throws ZodError
try {
  const data = schema.parse(input)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.issues)  // Array of validation issues
  }
}
```

## Rules

- Always use Zod schemas at input boundaries — never trust raw user data
- Always validate input at the boundary — Server Actions, API Routes, form handlers
- Use `z.infer<typeof schema>` for TypeScript types — never duplicate type definitions
- Use `.transform()` for normalization (trim, lowercase) — not in business logic
- Use `.refine()` for cross-field validation — not in controllers
