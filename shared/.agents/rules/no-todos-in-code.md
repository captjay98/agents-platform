---
trigger: file_edit
---

# No TODOs in Production Code

Never leave TODO, FIXME, or HACK comments in committed code.

## Anti-Patterns

```typescript
// TODO: Implement this later
// FIXME: This is broken
// HACK: Temporary workaround
// XXX: Need to revisit
```

## What To Do Instead

### If something needs to be done later:

- Create a GitHub/GitLab issue
- Add to project backlog
- Document in a separate tracking system

### If code is incomplete:

- Don't commit it
- Throw an error with context
- Create a stub with clear error message

```typescript
// Instead of TODO, throw meaningful error
throw new Error(
  'Feature not implemented: Payment refunds. See issue #123'
)
```

## Exceptions

- Draft PRs for work-in-progress
- Local development only
- Clearly marked as draft/WIP
