---
globs:
  - "**/*.tsx"
  - "**/*.ts"
alwaysApply: false
---

# Next.js Server Component Boundaries

## Rules

1. **Client components cannot be async** — if a file has `'use client'`, no component can be `async function` or return `Promise`. Fetch data in a server parent and pass as props.

2. **Props crossing server → client must be serializable** — no functions (except server actions), no `Date` objects (use `.toISOString()`), no `Map`/`Set` (convert to object/array), no class instances (pass plain objects).

3. **Push `'use client'` as deep as possible** — only the leaf components that need interactivity should be client components. Keep data fetching in server components.

4. **Server Actions are the exception** — functions marked with `'use server'` CAN be passed from server to client components.

5. **Don't import server-only code in client components** — use the `server-only` package to enforce boundaries:
```bash
npm install server-only
```
```ts
// lib/db.ts
import 'server-only'
export async function getUsers() { ... }
```
