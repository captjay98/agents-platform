---
name: api-contract-sync
description: Cross-platform type synchronization after API surface changes. Use when backend endpoints, validation rules, or response shapes change and frontend/mobile consumers must stay aligned.
---

# API Contract Sync

## When to Use (CRITICAL)

After any API surface change: new endpoint, changed response shape, removed field, renamed key.

## Workflow (CRITICAL)

1. Identify affected consumers (frontend, mobile, or both)
2. Update TypeScript types / Dart models to match new API shape
3. Update validation schemas (Zod for frontend, FormRequest for backend)
4. Update API client calls and service files
5. Run type checks across all consumers (`tsc --noEmit`, `dart analyze`)
6. Verify integration tests pass

## Conventions

- Backend API is source of truth
- Frontend and mobile are consumers — they adapt to the API, not the other way around
- Breaking changes require coordination (deprecation period or versioning)
- Response shape changes must update API Resources (Laravel) or DTOs (NestJS)

## Rules

- Never ship a backend change without updating consumer types in the same PR/session
- Run type checks before committing — catch mismatches at build time, not runtime
