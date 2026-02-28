---
trigger: file_edit
globs: ['**/*.test.*', '**/*.spec.*', '**/test/**']
---

# Test What Matters

Test behavior and outcomes, not implementation details. Focus coverage on high-risk paths.

## Priority

1. Money flows and financial calculations
2. Auth and security boundaries
3. Business logic and state transitions
4. Integration points and API contracts
5. Edge cases (empty, null, concurrent, overflow)

## Anti-patterns

- Testing private methods directly
- Asserting on internal state instead of output
- 100% coverage on CRUD with 0% on business logic
- Mocking everything (test the integration)
