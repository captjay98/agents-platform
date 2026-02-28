---
description: 'Create structured conventional commits from staged changes'
---

@fullstack-engineer Create a commit plan for the current changes: $ARGUMENTS

## Protocol

1. Run `git diff --cached --stat` to see staged changes.
2. If nothing staged, run `git diff --stat` and suggest what to stage.
3. Group changes by logical unit (feature, fix, refactor, docs).
4. Write conventional commit messages: `type(scope): description`

## Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes nor adds
- `docs`: Documentation only
- `test`: Adding or fixing tests
- `chore`: Build, CI, tooling changes

## Output

Ordered list of commits with:
- Files to include in each
- Commit message
- Brief rationale for the grouping
