# agents-platform

A complete AI agent configuration system for multi-project workspaces. Distribute skills, personas, commands, rules, and project context to AI agents — scoped to each project's tech stack.

## The Problem

You have multiple projects with different tech stacks. AI agents give generic advice because they don't know your conventions. Manually configuring each project leads to drift, duplication, and stale patterns.

## The Solution

```
agents-platform (central hub)
     │
     ├── 154 project skills (auto-updated from open-source repos + custom)
     ├── 22 global skills (workflow, quality, research — all tools)
     ├── 30 stacks (laravel-api, tanstack-fullstack, flutter, nestjs, etc.)
     ├── 27 commands (19 universal + 8 stack-scoped)
     ├── 31 rules (7 shared + 3 scaffold + 21 stack-scoped)
     ├── 9 personas (role-based agent identities)
     ├── 5 renderers (Claude, Kiro, Gemini, OpenCode, Factory)
     ├── 5 global MCP servers (sequential-thinking, tavily, Context7, semgrep, exa)
     │
     └── sync ──► Project A (picks stacks → gets matching config)
                  Project B (different stacks → different config)
```

Each project declares its stacks in `profile.toml`. Sync delivers only the relevant content.

## What's Included

| Component | Count | What it does |
|-----------|-------|-------------|
| **Skills** | 154 project + 22 global | Technical knowledge — patterns, conventions, integrations |
| **Personas** | 9 | Role-based agent identities with delegation patterns |
| **Commands** | 19 universal + 8 stack-scoped | Executable workflows (code-review, deploy, migrate, debug, etc.) |
| **Rules** | 7 shared + 3 scaffold + 21 stack | Coding constraints agents must follow |
| **Steering docs** | 10 | Project context (product map, tech stack, coding standards) |
| **Hooks** | 4 | Session-start reminder, conventional commits, branch protection, lockfile protection |
| **Memory** | Per-project | Institutional knowledge that persists across sessions |
| **Renderers** | 5 | Generate configs for Claude, Kiro, Gemini, OpenCode, Factory |
| **Global MCP** | 5 servers | sequential-thinking, tavily, Context7, semgrep, exa — all tools |
| **Stacks** | 30 | Technology-specific bundles of skills, rules, and commands |

### Personas

9 role-based personas with distinct expertise, communication style, and delegation patterns:

```
backend-engineer    frontend-engineer    fullstack-engineer
devops-engineer     security-engineer    qa-engineer
product-architect   data-analyst         mobile-engineer
```

### Commands

27 executable workflows — 19 universal (all projects) + 8 stack-scoped (only matching projects):

**Universal:**
```
code-review    commit-plan    execute         plan-feature
debug          migrate        refactor        dependency-update
prime          quickstart     release-readiness
test-coverage  ui-audit       accessibility-audit
incident-commander  performance-audit  sync-docs
neon-setup     update-devlog
```

**Stack-scoped:**
```
cloudflare-deploy/debug/setup    → cloudflare stack only
sentry-setup/triage              → sentry stack only
laravel-cloud-deploy/debug/setup → laravel-cloud stack only
```

### Renderers

| Renderer | Output | Skills approach |
|----------|--------|----------------|
| Claude | `.claude/CLAUDE.md` | Copies to `.claude/skills/` |
| Kiro | `.kiro/` | Copies to `.kiro/skills/`, reads AGENTS.md |
| Gemini | `.gemini/` | Reads `.agents/` directly |
| OpenCode | `.opencode/` + `opencode.json` | Copies to `.opencode/skills/` |
| Factory | `.factory/FACTORY.md` | Copies to `.factory/skills/` |

### Global MCP

5 MCP servers managed by the platform, synced to all AI tools:

| Server | Purpose |
|--------|---------|
| `sequential-thinking` | Reasoning chains for complex tasks |
| `tavily` | Web search and content extraction |
| `Context7` | Library documentation lookup |
| `semgrep` | Code security scanning |
| `exa` | Web search |

**How it works:**

Source of truth: `global/.agents/mcp/servers.json`. Sync merges platform servers into each tool's global config:

| Tool | Config file | Key |
|------|-------------|-----|
| Kiro | `~/.kiro/settings/mcp.json` | `mcpServers` |
| Gemini | `~/.gemini/settings.json` | `mcpServers` |
| OpenCode | `~/.config/opencode/opencode.json` | `mcp` |
| Claude | `~/claude/mcp.json` | `mcpServers` |
| Factory | `~/.factory/mcp.json` | `mcpServers` |

Merge strategy: platform servers overwrite, user-added servers preserved. Existing config keys (model, plugins, etc.) are never touched.

**Adding a global MCP server:**

```bash
# Edit source of truth
vim global/.agents/mcp/servers.json

# Sync to all tools
agents-platform sync --all
```

**Project-level MCP** is separate and user-managed. Each project has `.agents/mcp/servers.json` for project-specific servers (database, monitoring, framework tools). The platform provides an empty template — users fill it in:

```json
{
  "version": 1,
  "servers": {
    "postgres": {
      "command": "bunx",
      "args": ["@modelcontextprotocol/server-postgres@0.6.2", "${DATABASE_URL}"]
    }
  }
}
```

At runtime, tools merge both layers: global (from `~/`) + project (from the project dir).

### Global Skills

22 tool-level skills available across all projects and all AI tools. These are workflow, quality, and research skills — not project-specific.

| Source | Count | Skills |
|--------|-------|--------|
| obra/superpowers | 13 | brainstorming, writing-plans, executing-plans, dispatching-parallel-agents, etc. |
| tavily-ai/skills | 5 | search, extract, crawl, research, tavily-best-practices |
| vercel-labs | 2 | find-skills, agent-browser |
| anthropics/skills | 1 | writing-skills |
| custom | 1 | documentation-standards |

**How it works:**

```
agents-platform/global/.agents/skills/brainstorming/
         │  sync (symlink)
         ▼
~/.agents/skills/brainstorming
         │  sync (symlink — mirrors to all tool dirs)
         ▼
~/.kiro/skills/brainstorming
~/.claude/skills/brainstorming
~/.factory/skills/brainstorming
~/.opencode/skills/brainstorming
```

Both hops are managed by sync. Add a skill → all tools get it. Remove a skill → stale symlinks cleaned automatically. User-installed skills (real directories, not symlinks) are never touched.

**Updating global skills:**

```bash
# Update all from obra/superpowers
npx skills add obra/superpowers --all -g

# Update tavily skills
npx skills add tavily-ai/skills --all -g

# Then sync to propagate
agents-platform sync --all
```

Sources tracked in `global/.agents/skills-manifest.json`.

## Before / After

Without agents-platform:

```typescript
// Agent produces generic code
app.post('/api/orders', async (req, res) => {
  const order = await db.query('INSERT INTO orders ...')
  res.json(order)
})
```

With agents-platform:

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

## How It Works

When you run `agents-platform sync`, five layers apply in order:

| Layer | Source | Behavior | Purpose |
|-------|--------|----------|---------|
| 0. Global | `global/.agents/` | Symlink to `~/` | Tool-level skills + MCP for all AI tools |
| 1. Tooling | `tooling/` | Always overwrites | Build scripts, renderers |
| 2. Scaffold | `scaffold/.agents/` | Skip existing | Project templates (personas, commands, steering) |
| 3. Shared | `shared/.agents/` | Skip existing | Universal skills and rules |
| 4. Stacks | `shared/.agents/stacks/<name>/` | Skills/rules overwrite, commands skip existing | Stack-specific content |

**Stack-scoped commands:** Stacks can include commands (e.g., `cloudflare-deploy` in the cloudflare stack). These use `skipExisting` — delivered once, then the project owns them. A project without the cloudflare stack never gets cloudflare commands.

## Quick Start

```bash
# Install
git clone <repo-url> && cd agents-platform
bun install && bun link

# Interactive setup (auto-detects tech stack)
agents-platform setup ~/projects/my-app

# Or agent-friendly (no prompts)
agents-platform setup ~/projects/my-app --auto

# Or manual
agents-platform init ~/projects/my-app
vim ~/projects/my-app/.agents/profile.toml
agents-platform sync --all
cd ~/projects/my-app && bun .agents/scripts/build.mjs
```

Post-setup, fill in:
1. Persona placeholders: `.agents/personas/*.md`
2. Steering docs: `.agents/steering/*.md`
3. Project memory: `.agents/memory/project-memory.md`
4. Hook session-start message: `.agents/hooks/hooks.json`

## CLI

```
agents-platform setup <path> [--auto]   Interactive or agent-friendly setup
agents-platform init <path>             Bootstrap from scaffold
agents-platform sync [--all]            Sync to projects [--dry-run] [--tooling-only]
agents-platform build                   Build AGENTS.md and tool configs
agents-platform lint                    Lint .agents/ content
agents-platform signoff                 Full quality gate: build + lint + verify
agents-platform validate                Check all projects for issues
agents-platform add-stack <name>        Create a new stack skeleton
agents-platform list-stacks             Show all available stacks
agents-platform list-projects           Show registered projects and their stacks
agents-platform list-renderers          Show available AI tool renderers
```

## Layout

```
agents-platform/
├── bin/agents-platform.mjs              # CLI entry point
├── sync.mjs                             # Sync engine (5 layers + global)
├── update-skills.mjs                    # Pull latest from upstream repos
├── interactive-init.mjs                 # Interactive setup wizard
├── projects.json                        # Registered project paths
├── global/.agents/
│   ├── skills/                          # 22 tool-level skills
│   ├── skills-manifest.json             # Tracks upstream sources
│   └── mcp/servers.json                 # 5 global MCP servers
├── shared/.agents/
│   ├── skills/                          # Shared skills (all projects)
│   ├── stacks/                          # 30 technology stacks
│   │   └── <stack>/
│   │       ├── skills/                  # Stack-specific skills
│   │       ├── rules/                   # Stack-specific rules
│   │       ├── commands/                # Stack-specific commands
│   │       └── stack.toml
│   ├── rules/                           # 7 universal rules
│   └── skills-manifest.json             # Tracks 76 upstream sources
├── scaffold/.agents/                    # Template for new projects
│   ├── personas/                        # 9 role-based personas
│   ├── commands/                        # 19 universal commands
│   ├── steering/                        # 10 project context docs
│   ├── rules/                           # 3 scaffold rules
│   ├── hooks/                           # 4 safety hooks
│   └── memory/                          # Project memory template
└── tooling/
    └── renderers/                       # claude, kiro, gemini, opencode, factory
```

## Stacks

30 technology stacks. Projects opt in via `profile.toml`:

`tanstack-fullstack` · `tanstack-frontend` · `laravel-api` · `nextjs` · `nestjs` · `flutter` · `cloudflare` · `sentry` · `tailwind` · `better-auth` · `neon-kysely` · `neon-eloquent` · `typeorm` · `bullmq` · `firebase` · `payments-laravel` · `payments-typescript` · `payments-nestjs` · `laravel-cloud` · `laravel-reverb` · `laravel-horizon` · `spatie` · `bouncer` · `meilisearch` · `zustand` · `tiptap` · `cloudinary` · `resend` · `capacitor` · `maps`

## Upstream Sources

76 project skills auto-updated from open-source repos:

[Sentry](https://github.com/getsentry/sentry-for-ai) · [Cloudflare](https://github.com/cloudflare/skills) · [Vercel](https://github.com/vercel-labs/next-skills) · [TanStack](https://github.com/tanstack/agent-skills) · [Anthropic](https://github.com/anthropics/skills) · [Laravel](https://github.com/iSerter/laravel-claude-agents) · [Firebase](https://github.com/nicholasgriffintn/firebase-agent-skills) · [shadcn/ui](https://github.com/shadcn-ui/ui) · [Neon](https://github.com/neondatabase/agent-skills) · [sergiodxa](https://github.com/sergiodxa/agent-skills) · [ibelick](https://github.com/ibelick/ui-skills)

## Testing

```bash
bun test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
