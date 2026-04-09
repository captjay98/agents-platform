# agents-platform

Stack-based AI agent skill distribution for multi-project workspaces. Give every project the right skills for its tech stack — automatically.

## The Problem

You have multiple projects with different tech stacks. AI agents (Claude, Kiro, Cursor, etc.) give generic advice because they don't know your conventions. Manually copying skills between projects leads to drift, duplication, and stale patterns.

## The Solution

```
agents-platform (central hub)
     │
     ├── 76 upstream skills (auto-updated from open-source repos)
     ├── 71 custom skills (your conventions, patterns, integrations)
     ├── 30 stacks (laravel-api, tanstack-fullstack, flutter, nestjs, etc.)
     │
     └── sync ──► Project A (picks stacks → gets matching skills)
                  Project B (different stacks → different skills)
                  Project C (...)
```

Each project declares its stacks in `profile.toml`. Sync delivers only the relevant skills. A Laravel project gets Laravel skills. A TanStack project gets TanStack skills. No pollution.

## Before / After

Without skills, an AI agent produces generic code:

```typescript
// ❌ Generic — agent doesn't know your architecture
app.post('/api/orders', async (req, res) => {
  const order = await db.query('INSERT INTO orders ...')
  res.json(order)
})
```

With `tanstack-four-layer-arch` + `error-handling` skills loaded:

```typescript
// ✅ Project-aware — agent follows your four-layer architecture
export const createOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(createOrderSchema)
  .handler(async ({ data }) => {
    const { withErrorBoundary } = await import('~/features/shared/utils/error-boundary.server')
    return withErrorBoundary('orders.create', 'orders', async () => {
      const { requireAuth } = await import('~/features/shared/auth/session/auth-middleware.server')
      const session = await requireAuth()
      const { createOrderApplication } = await import('./application.server')
      return await createOrderApplication(session.user.id, data)
    })
  })
```

Same for Laravel — without skills vs with `laravel-api-conventions`:

```php
// ❌ Generic
Route::post('/orders', function (Request $request) {
    $order = Order::create($request->all());
    return response()->json($order);
});

// ✅ Project-aware — thin controller, service layer, ApiResponseTrait
class OrderController extends Controller
{
    use ApiResponseTrait;

    public function store(CreateOrderRequest $request, OrderService $service): JsonResponse
    {
        $order = $service->createOrder($request->validated());
        return $this->createdResponse(new OrderResource($order), 'Order created');
    }
}
```

## Quick Start

```bash
# Install
git clone <repo-url> && cd agents-platform
bun install && bun link

# Bootstrap a new project
agents-platform init ~/projects/my-app

# Edit stacks
vim ~/projects/my-app/.agents/profile.toml
# stacks = ["laravel-api", "flutter", "cloudflare", "sentry", "tailwind"]

# Sync skills to all projects
agents-platform sync --all

# Update upstream skills (76 from 12 open-source repos)
bun update-skills.mjs --all
agents-platform sync --all
```

## How It Works

When you run `agents-platform sync`, five layers apply in order:

| Layer | Source | Behavior | Purpose |
|-------|--------|----------|---------| 
| 0. Global | `global/.agents/skills/` | Symlink to `~/.agents/skills/` | Tool-level skills shared across all AI tools |
| 1. Tooling | `tooling/` | Always overwrites | Build scripts, renderers |
| 2. Scaffold | `scaffold/.agents/` | Skip existing | Project templates (profile, personas, commands) |
| 3. Shared | `shared/.agents/skills/` | Skip existing | Universal skills all projects get |
| 4. Stacks | `shared/.agents/stacks/<name>/` | Always overwrites | Stack-specific skills, rules |

Local project skills always win — if a project has its own version of a skill, sync won't overwrite it.

## CLI

```
agents-platform init <path>          Bootstrap a new project from scaffold
agents-platform sync [--all]         Sync to projects [--dry-run] [--tooling-only]
agents-platform build                Build AGENTS.md and tool configs (run in project dir)
agents-platform lint                 Lint .agents/ content (run in project dir)
agents-platform signoff              Full quality gate: build + lint + verify
agents-platform validate             Check all projects for issues
agents-platform add-stack <name>     Create a new stack skeleton
agents-platform list-stacks          Show all available stacks
agents-platform list-projects        Show registered projects and their stacks
agents-platform list-renderers       Show available AI tool renderers
```

## Layout

```
agents-platform/
├── bin/agents-platform.mjs          # CLI entry point
├── sync.mjs                         # Sync engine
├── update-skills.mjs                # Pull latest from upstream repos
├── bootstrap.mjs                    # Scaffold + sync for new projects
├── projects.json                    # Registered project paths
├── global/.agents/skills/           # 26 tool-level skills (symlinked to ~/.agents/)
├── shared/
│   └── .agents/
│       ├── skills/                  # 18 shared skills (all projects)
│       ├── stacks/                  # 30 technology stacks
│       ├── rules/                   # Universal rules
│       └── skills-manifest.json     # Tracks 76 upstream sources
├── scaffold/.agents/                # Template for new projects
└── tooling/                         # Build scripts + renderers
    └── renderers/                   # claude, kiro, gemini, opencode, factory
```

## Stacks

Each stack is a directory under `shared/.agents/stacks/` containing skills and rules for a specific technology:

```toml
# shared/.agents/stacks/laravel-api/stack.toml
[stack]
name = "laravel-api"
description = "Laravel API patterns and conventions"
requires = []
```

Projects opt in via `profile.toml`:

```toml
# my-project/.agents/profile.toml
stacks = ["laravel-api", "flutter", "cloudflare", "sentry", "tailwind"]
```

Run `agents-platform list-stacks` to see all 30 stacks.

## Skills

**147 total** — 76 upstream (auto-updatable) + 71 custom.

### Upstream (76 skills from 12 repos)

Auto-updated via `bun update-skills.mjs --all`. Sources include:

| Source | What |
|--------|------|
| `getsentry/sentry-for-ai` | Sentry SDKs + workflow |
| `iSerter/laravel-claude-agents` | Laravel patterns |
| `cloudflare/skills` | Workers, Durable Objects, Wrangler |
| `vercel-labs/next-skills` | Next.js best practices |
| `tanstack/agent-skills` | TanStack Query/Router/Start |
| `anthropics/skills` | Frontend design, webapp testing |
| `sergiodxa/agent-skills` | React, JS, async, accessibility |
| `ibelick/ui-skills` | UI validation, accessibility, metadata |

### Custom (71 skills)

Hand-written for your conventions. Examples:
- `tanstack-four-layer-arch` — Transport → Application → Domain → Repository
- `laravel-api-conventions` — Controller → Service → Model, ApiResponseTrait
- `flutter-conventions` — Riverpod, GoRouter, Dio, Freezed
- `financial-patterns` — Decimal precision, Naira/kobo, currency formatting
- `paystack-laravel` / `paystack-nestjs` — Payment provider integrations

### Payment Stacks (split by framework)

| Stack | Skills | Projects |
|-------|--------|----------|
| `payments-laravel` | paystack-laravel, nomba-laravel, squadco-laravel | Projavi, DeliveryNexus |
| `payments-typescript` | nomba-typescript, squadco-typescript | LivestockAI |
| `payments-nestjs` | paystack-nestjs | Eweko |

## Managed Projects

| Project | Stack | Stacks | Skills (local) |
|---------|-------|--------|----------------|
| LivestockAI | TanStack Start + Cloudflare Workers + Better Auth + Kysely/Neon | 9 | 71 (13 local) |
| Projavi | Laravel API + TanStack frontend + Flutter mobile + Cloudflare | 14 | 99 (6 local) |
| DeliveryNexus | Laravel API + TanStack frontend + Flutter mobile + Multi-tenant | 16 | 116 (21 local) |
| Eweko | Next.js + NestJS + TypeORM + BullMQ + Cloudflare | 10 | 58 (5 local) |

## Renderers

Renderers transform `.agents/` content into tool-specific config files. Auto-discovered — drop a `.mjs` file in `tooling/renderers/`:

| Renderer | Output |
|----------|--------|
| `claude.mjs` | `.claude/CLAUDE.md` |
| `kiro.mjs` | `.kiro/` |
| `gemini.mjs` | `.gemini/` |
| `opencode.mjs` | `.opencode/` |
| `factory.mjs` | `.factory/` |

## Adding a New Project

```bash
# 1. Bootstrap
agents-platform init ~/projects/new-app --toolchains kiro,claude

# 2. Configure stacks
vim ~/projects/new-app/.agents/profile.toml

# 3. Sync
agents-platform sync --all

# 4. Build tool configs
cd ~/projects/new-app && bun .agents/scripts/build.mjs
```

## Adding a New Stack

```bash
agents-platform add-stack prisma
# Creates shared/.agents/stacks/prisma/ with skills/, rules/, stack.toml
# Add SKILL.md files, then declare in project profile.toml files
```

## Global Skills

26 tool-level skills (workflow, code quality, agent orchestration) live at `~/.agents/skills/` via symlinks. Shared across all AI tools:

```
~/.kiro/skills/brainstorming   → ~/.agents/skills/brainstorming → agents-platform/global/...
~/.claude/skills/brainstorming → ~/.agents/skills/brainstorming → agents-platform/global/...
```

## For AI Agents

If you're an AI agent helping a user set up agents-platform for a new project, follow this procedure:

### 1. Detect the tech stack

Scan the project root for:
- `package.json` → check dependencies for `next`, `@tanstack/react-start`, `@nestjs/core`, `react`
- `composer.json` → check for `laravel/framework`
- `pubspec.yaml` → Flutter project
- `wrangler.toml` → Cloudflare Workers deployment

### 2. Map dependencies to stacks

| If you find... | Add stack |
|---|---|
| `@tanstack/react-start` | `tanstack-fullstack` |
| `@tanstack/react-router` (no start) | `tanstack-frontend` |
| `next` | `nextjs` |
| `@nestjs/core` | `nestjs` |
| `laravel/framework` | `laravel-api` |
| Flutter `pubspec.yaml` | `flutter` |
| `wrangler.toml` | `cloudflare` |
| `tailwindcss` | `tailwind` |
| `@sentry/*` or `sentry/*` | `sentry` |
| `better-auth` | `better-auth` |
| `kysely` | `neon-kysely` |
| `typeorm` | `typeorm` |
| `bullmq` or `@nestjs/bullmq` | `bullmq` |
| `@paystack/*` or paystack integration | `payments-laravel` / `payments-typescript` / `payments-nestjs` (match framework) |

### 3. Generate profile.toml

```toml
[project]
name = "<project-name>"

[toolchains]
enabled = ["kiro", "claude"]

stacks = ["<detected-stacks>"]
```

### 4. Run setup

```bash
cd /path/to/agents-platform

# Auto mode — no prompts, uses detected stacks (agent-friendly)
agents-platform setup /path/to/project --auto

# Or manual
agents-platform init /path/to/project
# Then edit .agents/profile.toml with detected stacks
agents-platform sync --all
cd /path/to/project && bun .agents/scripts/build.mjs
```

### 5. Verify

```bash
ls /path/to/project/.agents/skills/  # Should show skills matching declared stacks
```

## Testing

```bash
bun test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
