---
description: 'Update dependencies safely — changelog review, update, test, verify'
---

@fullstack-engineer Update dependencies: $ARGUMENTS

## Protocol

1. **Audit**: List outdated dependencies. Categorize as patch, minor, or major.
2. **Review**: Check changelogs and migration guides for breaking changes.
3. **Update**: Apply updates in order — patches first, then minors, then majors (one at a time for majors).
4. **Test**: Run full test suite after each update batch. Check for type errors, runtime errors, and deprecation warnings.
5. **Verify**: Build succeeds. No new warnings. Application behavior unchanged.
6. **Lock**: Commit updated lockfile with clear commit message listing what was updated.

## Rules

- Never update all dependencies at once — batch by risk level
- Major version updates get their own commit and PR
- Check for peer dependency conflicts before updating
- If a dependency has a migration guide, follow it exactly
