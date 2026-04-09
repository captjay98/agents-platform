---
description: 'Structured refactoring — scope, plan, execute, verify no regressions'
---

@fullstack-engineer Refactor: $ARGUMENTS

## Protocol

1. **Scope**: Define exactly what's being refactored and what's NOT changing. List affected files.
2. **Motivation**: Why refactor? (readability, performance, duplication, architecture alignment)
3. **Plan**: Break into small, independently verifiable steps. Each step should leave the code working.
4. **Execute**: Apply changes one step at a time. Run tests after each step.
5. **Verify**: All existing tests pass. No behavior changes unless explicitly intended.
6. **Review**: Check that the refactored code follows project conventions and patterns.

## Rules

- Never refactor and add features in the same change
- Every intermediate step must compile and pass tests
- If tests don't exist for the code being refactored, write them FIRST
- Keep commits small and focused — one concern per commit
