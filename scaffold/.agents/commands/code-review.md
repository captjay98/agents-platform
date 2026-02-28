---
description: 'Comprehensive code review against project standards'
---

@fullstack-engineer Review this code: $ARGUMENTS

## Review Checklist

1. **Correctness**: Does it do what it claims? Edge cases handled?
2. **Architecture**: Does it follow the project's layer structure?
3. **Security**: Input validation? Auth checks? SQL injection? XSS?
4. **Performance**: N+1 queries? Unnecessary re-renders? Missing indexes?
5. **Testing**: Are critical paths tested? Are tests meaningful?
6. **Naming**: Do names communicate intent?
7. **Error handling**: Are errors caught, typed, and user-friendly?

<!-- PROJECT: Add project-specific review criteria -->

## Output Format

For each issue found:
- **File**: path and line
- **Severity**: critical / warning / nit
- **Issue**: what's wrong
- **Fix**: what to do instead
