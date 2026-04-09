---
layout: default
title: agents-platform
---

# agents-platform

**A complete AI agent configuration system for multi-project workspaces.**

Distribute skills, personas, commands, rules, and project context to AI agents — scoped to each project's tech stack. Supports Claude, Kiro, Gemini, OpenCode, and Factory.

---

## The Problem

You have multiple projects with different tech stacks. AI agents give generic advice because they don't know your conventions, architecture, or team roles. Manually configuring each project's agent setup leads to drift, duplication, and stale patterns.

## The Solution

```
agents-platform (central hub)
     │
     ├── 147 skills      (76 auto-updated from open-source repos)
     ├── 9 personas       (role-based agent identities)
     ├── 22 commands      (executable workflows / runbooks)
     ├── 7+ rules         (coding constraints per stack)
     ├── 10 steering docs (project context)
     ├── 5 renderers      (Claude, Kiro, Gemini, OpenCode, Factory)
     ├── 30 stacks        (technology-specific bundles)
     │
     └── sync ──► Project A (picks stacks → gets matching config)
                  Project B (different stacks → different config)
```

## What Gets Distributed

| Component | What it does |
|-----------|-------------|
| **Skills** | Technical knowledge — patterns, conventions, integrations |
| **Personas** | Role-based identities: backend-engineer, frontend-engineer, qa-engineer, security-engineer, etc. |
| **Commands** | Executable workflows: code-review, deploy, incident-commander, performance-audit |
| **Rules** | Coding constraints agents must follow: git-safety, guard-clauses, no-todos |
| **Steering** | Project context: product map, tech stack, coding standards, testing guidelines |
| **Hooks** | Auto-triggered behaviors on session start |
| **Memory** | Institutional knowledge that persists across sessions |

## Before / After

**Without agents-platform:**

```typescript
// Agent produces generic code
app.post('/api/orders', async (req, res) => {
  const order = await db.query('INSERT INTO orders ...')
  res.json(order)
})
```

**With agents-platform:**

```typescript
// Agent follows your four-layer architecture, error handling, and auth patterns
export const createOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }) => {
    return withErrorBoundary('orders.create', 'orders', async () => {
      const session = await requireAuth()
      return await createOrderApplication(session.user.id, data)
    })
  })
```

## Supported AI Tools

| Tool | Renderer | Output |
|------|----------|--------|
| Claude Code | `claude.mjs` | `.claude/CLAUDE.md` |
| Kiro | `kiro.mjs` | `.kiro/` + subagent templates |
| Gemini | `gemini.mjs` | `.gemini/` |
| OpenCode | `opencode.mjs` | `.opencode/` |
| Factory | `factory.mjs` | `.factory/FACTORY.md` |

Renderers are pluggable — drop a `.mjs` file in `tooling/renderers/` and it's auto-discovered.

## Personas

9 role-based personas with distinct expertise and delegation patterns:

`backend-engineer` · `frontend-engineer` · `fullstack-engineer` · `devops-engineer` · `security-engineer` · `qa-engineer` · `product-architect` · `data-analyst` · `mobile-engineer`

Each includes autonomous instructions, real code patterns, critical constraints, and delegation priorities.

## Stacks

30 technology stacks. Projects opt in via `profile.toml`:

`tanstack-fullstack` · `tanstack-frontend` · `laravel-api` · `nextjs` · `nestjs` · `flutter` · `cloudflare` · `sentry` · `tailwind` · `better-auth` · `neon-kysely` · `neon-eloquent` · `typeorm` · `bullmq` · `firebase` · `payments-laravel` · `payments-typescript` · `payments-nestjs` · `laravel-cloud` · `laravel-reverb` · `laravel-horizon` · `spatie` · `bouncer` · `meilisearch` · `zustand` · `tiptap` · `cloudinary` · `resend` · `capacitor` · `maps`

## Upstream Sources

76 skills auto-updated from open-source repos:

[Sentry](https://github.com/getsentry/sentry-for-ai) · [Cloudflare](https://github.com/cloudflare/skills) · [Vercel](https://github.com/vercel-labs/next-skills) · [TanStack](https://github.com/tanstack/agent-skills) · [Anthropic](https://github.com/anthropics/skills) · [Laravel](https://github.com/iSerter/laravel-claude-agents) · [Firebase](https://github.com/nicholasgriffintn/firebase-agent-skills) · [shadcn/ui](https://github.com/shadcn-ui/ui) · [Neon](https://github.com/neondatabase/agent-skills) · [sergiodxa](https://github.com/sergiodxa/agent-skills) · [ibelick](https://github.com/ibelick/ui-skills)

## Quick Start

```bash
# Install
git clone <repo-url> && cd agents-platform
bun install && bun link

# Interactive setup (auto-detects tech stack)
agents-platform setup ~/projects/my-app

# Or manual
agents-platform init ~/projects/my-app
vim ~/projects/my-app/.agents/profile.toml
agents-platform sync --all

# Check health
agents-platform status
```

## Numbers

| | |
|---|---|
| **Skills** | 147 (76 upstream + 71 custom) |
| **Personas** | 9 role-based identities |
| **Commands** | 22 executable workflows |
| **Stacks** | 30 technology bundles |
| **Renderers** | 5 AI tools supported |
| **Global skills** | 26 tool-level skills |

---

[View on GitHub](https://github.com/captjay98/agents-platform) · [Contributing](https://github.com/captjay98/agents-platform/blob/main/CONTRIBUTING.md)
