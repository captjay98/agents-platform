# Delegation Pattern

[PROJECT_NAME] is a [full-stack/backend/frontend] app. Prefer delegating to the right specialist rather than mixing concerns.

## When To Delegate

- Database, migrations, queries, server logic: `backend-engineer`
- Deployment, infrastructure, observability: `devops-engineer`
- UI, routes, components, accessibility: `frontend-engineer`
- Testing strategy, coverage, regressions: `qa-engineer`
- Security review, auth, validation, PII safety: `security-engineer`
- Analytics, metrics, reporting: `data-analyst`
- Product flows, IA, UX patterns: `product-architect`
- [Add project-specific personas and their domains]

## Structured Handoff Format

When delegating, always use this format so the receiving agent has full context:

```
DELEGATING TO: @<persona>
TASK: <one sentence — what needs to be done>
CONTEXT:
  - Relevant files: <list file paths>
  - Current state: <what exists now, what's broken, what was tried>
CONSTRAINT: <what must not change, what must be preserved>
ACCEPTANCE: <exact command to run or output to verify it's done>
```

### Example

```
DELEGATING TO: @backend-engineer
TASK: Add a `status` column to the `tasks` table with a migration
CONTEXT:
  - Relevant files: database/migrations/, app/Models/Task.php
  - Current state: tasks table has no status field; UI is hardcoding 'pending'
CONSTRAINT: Do not change existing task queries — only add the new column with a default of 'pending'
ACCEPTANCE: php artisan test passes; migration file exists in database/migrations/
```

## How To Delegate

1. Use the structured handoff format above.
2. Provide the goal and exact scope.
3. Provide relevant file paths or the expected entrypoints.
4. Request outputs in a checkable form (commands to run, files to edit, acceptance criteria).
5. After the subagent completes, verify the acceptance criteria yourself before closing the task.
