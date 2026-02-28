---
name: code-review-checklist
description: Universal code quality and security review criteria for high-standard applications
---

## Architecture Compliance

- [ ] Server functions use dynamic imports
- [ ] No static imports of database in server code
- [ ] Proper separation: UI components vs business logic
- [ ] Feature-based organization in `app/features/`

## Type Safety

- [ ] No `any` types (use `unknown` if needed)
- [ ] Zod validation on all server function inputs
- [ ] Kysely queries use explicit column selection
- [ ] Proper TypeScript strict mode compliance

## Security

- [ ] No secrets in code (use environment variables)
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (Kysely parameterized queries)
- [ ] Authentication checks on protected routes
- [ ] Proper error messages (no sensitive data leaks)

## Performance

- [ ] No N+1 queries (use joins)
- [ ] Proper database indexes on foreign keys
- [ ] Efficient queries (avoid SELECT \*)
- [ ] Bundle size considerations for frontend

## Testing

- [ ] Property tests for business logic
- [ ] Integration tests for database constraints
- [ ] Critical paths covered (auth, payments, data integrity)
- [ ] Tests pass before merging

## Code Style

- [ ] Consistent naming (camelCase functions, PascalCase components)
- [ ] Proper import order (React → third-party → local → types)
- [ ] No console.logs in production code
- [ ] Meaningful variable names

## Database

- [ ] Migrations are reversible (have `down()` function)
- [ ] Foreign keys have proper CASCADE/SET NULL
- [ ] CHECK constraints for data validation
- [ ] Indexes on frequently queried columns

## Accessibility

- [ ] Proper ARIA labels
- [ ] Keyboard navigation support
- [ ] Mobile-responsive design
- [ ] Color contrast compliance

## Documentation

- [ ] Complex logic has comments
- [ ] Public functions have JSDoc
- [ ] README updated if needed
- [ ] DEVLOG updated for significant changes
