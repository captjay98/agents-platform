---
alwaysApply: true
---

# NestJS Rules

1. **Never put business logic in controllers** — controllers validate input, call services, return responses. Logic lives in services.
2. **Always use Guards for auth** — never check `req.user` manually in controllers; use `@UseGuards()` with `JwtAuthGuard` or role guards.
3. **Never import across module boundaries without exporting** — if a service is needed outside its module, export it explicitly.
4. **Always use `class-validator` on DTOs** — never trust raw request body; every endpoint input must be a validated DTO.
5. **Never use `any` type on request/response shapes** — define DTOs and response interfaces explicitly.
6. **Always use `ConfigService` for env vars** — never read `process.env` directly in application code.
7. **Never throw raw errors from services** — use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, etc.) or a custom exception filter.
