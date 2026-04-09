---
description: 'Structured debugging protocol — reproduce, isolate, fix, verify'
---

@fullstack-engineer Debug this issue: $ARGUMENTS

## Protocol

1. **Reproduce**: Confirm the issue exists. Get exact steps, error messages, and affected environment.
2. **Isolate**: Narrow down to the specific file, function, or data condition causing the issue.
3. **Hypothesize**: Form 2-3 hypotheses ranked by likelihood. Test the most likely first.
4. **Fix**: Apply the minimal change that resolves the root cause (not just the symptom).
5. **Verify**: Confirm the fix works. Check for regressions in related functionality.
6. **Document**: Note what caused it and how to prevent recurrence.

## Rules

- Separate symptom from root cause — fix the cause, not the symptom
- Check logs, error traces, and recent changes before guessing
- Don't shotgun-debug (changing multiple things at once)
- If the fix is a workaround, document it and create a follow-up for the real fix
