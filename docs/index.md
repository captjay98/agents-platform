---
layout: default
title: agents-platform
---

# agents-platform

**Give your AI agents project-specific knowledge.**

Stop getting generic code from AI agents. agents-platform distributes the right skills to the right projects based on their tech stack — automatically.

---

## The Problem

You have multiple projects with different tech stacks. AI agents give generic advice because they don't know your conventions. Manually copying skills between projects leads to drift, duplication, and stale patterns.

## The Solution

```
agents-platform (central hub)
     │
     ├── 76 upstream skills (auto-updated from open-source repos)
     ├── 71 custom skills (your conventions, patterns, integrations)
     ├── 30 stacks (laravel, tanstack, flutter, nestjs, nextjs, etc.)
     │
     └── sync ──► Project A (picks stacks → gets matching skills)
                  Project B (different stacks → different skills)
                  Project C (...)
```

## Before / After

**Without skills** — agent produces generic code:

```typescript
app.post('/api/orders', async (req, res) => {
  const order = await db.query('INSERT INTO orders ...')
  res.json(order)
})
```

**With skills** — agent follows your architecture:

```typescript
export const createOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }) => {
    return withErrorBoundary('orders.create', 'orders', async () => {
      const session = await requireAuth()
      return await createOrderApplication(session.user.id, data)
    })
  })
```

## Numbers

| | |
|---|---|
| **Total Skills** | 147 |
| **Upstream (auto-updatable)** | 76 from 12 open-source repos |
| **Custom** | 71 hand-written for your conventions |
| **Stacks** | 30 technology stacks |
| **AI Tools** | Claude, Kiro, Gemini, OpenCode, Factory |

## Supported Stacks

`tanstack-fullstack` · `tanstack-frontend` · `laravel-api` · `nextjs` · `nestjs` · `flutter` · `cloudflare` · `sentry` · `tailwind` · `better-auth` · `neon-kysely` · `neon-eloquent` · `typeorm` · `bullmq` · `firebase` · `payments-laravel` · `payments-typescript` · `payments-nestjs` · `laravel-cloud` · `laravel-reverb` · `laravel-horizon` · `spatie` · `bouncer` · `meilisearch` · `zustand` · `tiptap` · `cloudinary` · `resend` · `capacitor` · `maps`

## Upstream Sources

Skills auto-updated from:

- [Sentry](https://github.com/getsentry/sentry-for-ai) — SDKs + workflow
- [Cloudflare](https://github.com/cloudflare/skills) — Workers, Durable Objects, Wrangler
- [Vercel](https://github.com/vercel-labs/next-skills) — Next.js best practices
- [TanStack](https://github.com/tanstack/agent-skills) — Query, Router, Start
- [Anthropic](https://github.com/anthropics/skills) — Frontend design
- [Laravel](https://github.com/iSerter/laravel-claude-agents) — 14 Laravel patterns
- [shadcn/ui](https://github.com/shadcn-ui/ui) — Component management
- [Neon](https://github.com/neondatabase/agent-skills) — Serverless Postgres

## Quick Start

```bash
# Install
git clone <repo-url> && cd agents-platform
bun install && bun link

# Interactive setup (auto-detects your tech stack)
agents-platform setup ~/projects/my-app

# Or manual
agents-platform init ~/projects/my-app
vim ~/projects/my-app/.agents/profile.toml
agents-platform sync --all
```

## How It Works

1. **Declare stacks** in your project's `profile.toml`
2. **Sync** delivers matching skills, rules, and configs
3. **Build** generates tool-specific configs (`.claude/`, `.kiro/`, etc.)
4. **AI agents** read the skills and produce project-aware code

Local project skills always win — your customizations are never overwritten.

---

[View on GitHub](https://github.com/user/agents-platform) · [Contributing](https://github.com/user/agents-platform/blob/main/CONTRIBUTING.md)
