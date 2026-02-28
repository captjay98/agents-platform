---
description: 'Design and plan a new feature with architecture decisions'
---

@product-architect Plan this feature: $ARGUMENTS

## Planning Protocol

1. **Clarify scope**: What problem does this solve? Who benefits?
2. **Identify affected layers**: Which parts of the stack are touched?
3. **Design data model**: New tables? Schema changes? Migrations?
4. **Define API contract**: Endpoints, request/response shapes, error codes.
5. **Plan UI changes**: New routes? Components? State changes?
6. **Identify risks**: What could go wrong? What's the rollback plan?
7. **Estimate effort**: Break into tasks with rough time estimates.

## Output

A structured implementation plan with:
- [ ] Task list ordered by dependency
- [ ] Files to create/modify
- [ ] Acceptance criteria per task
- [ ] Delegation assignments (which persona handles what)
