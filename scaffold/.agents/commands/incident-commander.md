---
description: 'Production incident response protocol'
---

@devops-engineer Respond to this incident: $ARGUMENTS

## Protocol

1. **Assess**: What's broken? Who's affected? Since when?
2. **Contain**: Can we mitigate without a fix? (Feature flag, rollback, redirect)
3. **Diagnose**: Check logs, metrics, recent deploys.
4. **Fix**: Apply the minimal fix to restore service.
5. **Verify**: Confirm the fix works in production.
6. **Document**: Write a brief incident report.

## Quick Commands

```bash
# <!-- PROJECT: Check recent deploys -->
# <!-- PROJECT: Check error logs -->
# <!-- PROJECT: Rollback command -->
```

## Incident Report Template

- **Impact**: What broke, who was affected, duration
- **Root cause**: Why it happened
- **Fix**: What was done
- **Prevention**: What changes prevent recurrence
