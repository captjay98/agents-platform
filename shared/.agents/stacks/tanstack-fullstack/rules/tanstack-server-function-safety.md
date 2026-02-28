---
globs:
  - "**/server.ts"
  - "**/server.tsx"
  - "**/*.server.ts"
alwaysApply: false
---

# TanStack Server Function Safety

Every server function created with `createServerFn` must:

1. **Validate all inputs** — use `.inputValidator()` with a Zod schema. Never trust client data.
2. **Check authentication** — verify the user session before any data access.
3. **Never expose secrets** — don't return database connection strings, API keys, or internal error details to the client.
4. **Use correct HTTP method** — `GET` for reads (cacheable), `POST` for mutations (never cached).
5. **Handle errors explicitly** — catch database/service errors and throw user-friendly messages. Don't leak stack traces.

```typescript
// GOOD — all 5 rules followed
export const updateItemFn = createServerFn({ method: 'POST' })     // 4. POST for mutation
  .inputValidator(z.object({ id: z.string().uuid(), name: z.string().min(1) }))  // 1. Validated
  .handler(async ({ data }) => {
    const session = await requireAuth()                              // 2. Auth checked
    try {
      return await updateItem(data.id, data.name, session.userId)
    } catch (error) {
      throw new Error('Failed to update item')                       // 5. User-friendly error
    }
    // 3. No secrets in return value
  })
```
