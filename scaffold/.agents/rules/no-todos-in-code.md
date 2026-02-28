---
trigger: file_edit
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.php']
---

# No TODOs in Code

TODOs are not a backlog. Either fix it now or create a ticket and reference it.

## Enforcement

- If you can fix it in < 5 minutes, fix it now
- Otherwise, create a ticket and reference: `// See PROJ-123`
- Never leave bare `// TODO` or `// FIXME` without a ticket
