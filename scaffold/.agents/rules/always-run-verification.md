---
trigger: always
globs: ['**/*']
---

# Always Run Verification

Never claim work is complete without running verification commands and showing the output.

## Why

"It should work" is not evidence. Assertions without proof waste review cycles.

## Enforcement

- Run the relevant check (test, lint, build, typecheck) after every change
- Include the command AND its output in your response
- If a check fails, fix it before claiming done

```bash
# <!-- PROJECT: Your verification commands -->
```
