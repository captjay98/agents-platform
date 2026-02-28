---
trigger: command
globs: ['**/*']
---

# Git Safety

Never force-push to shared branches. Never commit secrets. Always verify before pushing.

## Enforcement

- `main`/`develop` are protected — PR only
- Run tests before pushing
- Use conventional commits: `type(scope): description`
- No `.env` files in git (use `.env.example`)
- Review `git diff --staged` before every commit
