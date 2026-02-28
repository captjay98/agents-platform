# Shared Content

Stack-based content synced to projects based on their `profile.toml` stacks configuration.

## Structure

```
shared/.agents/
├── skills/           # 7 universal skills (error-handling, feature-structure, i18n-patterns, etc.)
├── rules/            # 7 universal rules (git-safety, meaningful-names, test-what-matters, etc.)
├── hooks/            # Canonical hooks.json (synced to all projects)
├── schema/           # JSON schemas for validation
└── stacks/           # 27 technology stacks
    ├── better-auth/
    ├── bouncer/
    ├── bullmq/
    ├── cloudflare/
    ├── firebase/
    ├── flutter/
    ├── laravel-api/
    ├── nestjs/
    ├── nextjs/
    ├── neon-kysely/
    ├── neon-eloquent/
    ├── payments/
    ├── sentry/
    ├── tanstack-fullstack/
    └── ... (27 total)
```

## Stack Structure

Each stack contains:
- `rules/` — Coding rules specific to the stack
- `skills/` — How-to guides for the stack

Example: `shared/.agents/stacks/nestjs/`
```
nestjs/
├── rules/
│   └── nestjs-rules.md
└── skills/
    ├── nestjs-api/SKILL.md
    ├── nestjs-architecture/SKILL.md
    ├── nestjs-security/SKILL.md
    └── nestjs-testing/SKILL.md
```

## Sync Behavior

When `node sync.mjs --all` runs:

1. **Tooling** → Always synced (overwrites)
2. **Scaffold** → Bootstrap only (skipExisting: true)
3. **Shared universal** → Synced with skipExisting: true (project wins)
4. **Stack content** → Synced without skipExisting (platform is canonical)

Projects declare stacks in `.agents/profile.toml`:

```toml
stacks = ["nestjs", "nextjs", "cloudflare", "sentry", "payments"]
```

Only content from declared stacks is synced to that project.

## Adding a New Stack

1. Create `shared/.agents/stacks/<stack-name>/`
2. Add `rules/` and `skills/` subdirectories
3. Write stack-specific rules and skills
4. Projects opt-in by adding stack name to their `profile.toml`
