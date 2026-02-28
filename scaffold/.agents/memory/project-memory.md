# Project Memory — [PROJECT_NAME]

## Stack
- **Runtime**: [e.g., Cloudflare Workers, Node.js, Bun]
- **Framework**: [e.g., Next.js, Laravel, NestJS, TanStack Start]
- **Database**: [e.g., PostgreSQL via Neon, MySQL, MongoDB]
- **ORM**: [e.g., Prisma, Kysely, TypeORM, Eloquent]
- **Auth**: [e.g., Better Auth, Laravel Sanctum, Passport, NextAuth]
- **State Management**: [e.g., TanStack Query, Redux, Zustand]
- **Testing**: [e.g., Vitest, Jest, PHPUnit]
- **Deploy**: [e.g., Vercel, Cloudflare Workers, AWS]

## Non-Negotiable Rules

1. **[Critical Rule 1]** — [why it exists, what breaks if violated]
2. **[Critical Rule 2]** — [why it exists, what breaks if violated]
3. **[Critical Rule 3]** — [why it exists, what breaks if violated]

## Architecture

```
[Describe your architecture pattern]
Example:
app/features/<domain>/
├── server.ts      # Auth, validation, orchestration
├── service.ts     # Business logic
├── repository.ts  # Database operations
└── types.ts       # TypeScript interfaces
```

## Key File Paths

| File | Purpose |
|------|---------|
| `[path/to/critical/file.ts]` | [what it does] |
| `[path/to/another/file.ts]` | [what it does] |

## Domain Model

[Describe your core entities and relationships]

Example:
- **User** → has many **Projects**
- **Project** → has many **Tasks**
- **Task** is the atomic unit — every feature is task-centric

## Key Metrics (Domain Knowledge)

| Metric | Formula | Target |
|--------|---------|--------|
| [Metric 1] | [formula] | [target] |
| [Metric 2] | [formula] | [target] |

## Known Technical Debt

- **[Issue 1]** — [description, impact, why not fixed yet]
- **[Issue 2]** — [description, impact, why not fixed yet]

## Architectural Decisions (Why)

- **[Decision 1]**: [what was chosen] — [why, what alternatives were rejected]
- **[Decision 2]**: [what was chosen] — [why, what alternatives were rejected]

## Environments

| Env | Command | Notes |
|-----|---------|-------|
| Local | `[command]` | Uses `.env` |
| Staging | `[command]` | Safe for testing |
| Production | `[command]` | Requires all secrets set |

## Required Secrets

- `[SECRET_NAME]` — [what it's for]
- `[SECRET_NAME]` — [what it's for]

## Session Notes

[Add dated notes about major changes, decisions, or discoveries]

Example:
- 2026-02: Migrated from X to Y because Z
- 2026-01: Discovered N+1 query pattern in feature X, fixed with join
