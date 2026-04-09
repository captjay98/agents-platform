---
description: 'Sync all documentation — codebase docs, API references, and agent guides'
---

@fullstack-engineer Sync documentation: $ARGUMENTS

## Protocol

1. **Codebase docs**: Check README.md is current with setup instructions. Verify CHANGELOG.md has recent changes.
2. **API docs**: Verify API documentation matches actual endpoints and response shapes.
3. **Agent guides**: Rebuild AGENTS.md and tool configs:
```bash
bun .agents/scripts/build.mjs
```
4. **Steering docs**: Review `.agents/steering/` — does it reflect current architecture and conventions?
5. **Memory**: Check `.agents/memory/project-memory.md` — any stale info?
6. **Personas**: Verify personas reference current tech stack and patterns.

## Rules

- Don't generate docs from assumptions — verify against actual code
- Flag any doc that references removed files or deprecated APIs
- Architecture docs should match the real directory structure
