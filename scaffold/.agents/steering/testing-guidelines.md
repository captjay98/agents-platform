# Testing Guidelines

<!-- PROJECT: Your testing approach. Example:

## Commands
- Unit: `bun run test`
- Integration: `bun run test:integration`
- E2E: `bun run test:e2e`

## Coverage Targets
- Business logic: 80%+
- API endpoints: 70%+
- UI components: 60%+
-->

## Priorities

1. Money/financial flows — highest
2. Auth/security boundaries — highest
3. Business logic — high
4. CRUD scaffolding — moderate

## Anti-patterns

- Don't test implementation details
- Don't mock everything — test real integrations where possible
- Don't chase 100% coverage — cover what matters
