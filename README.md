# agents-platform

Stack-based AI agent configuration system. Distributes rules, skills, personas, commands, and hooks to managed projects through a layered sync system. Supports Claude, Kiro, Gemini, OpenCode, and Factory.

## Quick Start

```bash
# Install CLI
bun link

# Sync all registered projects
agents-platform sync

# Preview changes without writing
agents-platform sync --dry-run

# Bootstrap a new project
agents-platform init ~/projects/new-app

# Check all projects for issues
agents-platform validate
```

## CLI

```
agents-platform init <path>          Bootstrap a new project from scaffold
agents-platform sync [--all]         Sync tooling and stacks to projects [--dry-run] [--tooling-only]
agents-platform build                Build AGENTS.md and tool configs (run in project dir)
agents-platform lint                 Lint .agents/ content (run in project dir)
agents-platform signoff              Full quality gate: build + lint + verify + check-mcp
agents-platform validate             Check all projects for issues (deps, placeholders)
agents-platform add-stack <name>     Create a new stack skeleton [--community]
agents-platform list-stacks          Show all available stacks
agents-platform list-projects        Show registered projects and their stacks
agents-platform list-renderers       Show available AI tool renderers
```

## Layout

```
agents-platform/
├── bin/
│   └── agents-platform.mjs   # CLI entry point
├── tooling/                   # Canonical scripts → synced to projects
│   ├── build.mjs              # Generate AGENTS.md + toolchain configs
│   ├── verify.mjs             # Validate .agents/ structure
│   ├── lint.mjs               # Lint agent content
│   ├── config.mjs             # Shared config helpers (TOML parser)
│   ├── toolchains.mjs         # Auto-discovers renderers
│   ├── agents.mjs             # Agent content reader
│   ├── signoff.mjs            # Sign-off workflow
│   ├── check-mcp.mjs          # MCP server validation
│   └── renderers/             # Pluggable — drop a .mjs file, it's picked up
│       ├── common.mjs         # Shared helpers
│       ├── claude.mjs
│       ├── kiro.mjs
│       ├── gemini.mjs
│       ├── opencode.mjs
│       └── factory.mjs
├── scaffold/                  # Template for new projects (copied once)
│   └── .agents/
│       ├── commands/          # 21 workflow commands
│       ├── personas/          # 9 role templates
│       ├── rules/             # 9 coding rules
│       ├── skills/            # 4 universal skills
│       ├── steering/          # 10 project context docs
│       ├── memory/            # Institutional knowledge template
│       ├── includes/shared/   # Delegation pattern template
│       └── profile.toml
├── global/                    # Tool-level skills (symlinked to ~/.agents/skills/)
│   └── .agents/
│       └── skills/            # 26 workflow, quality, and orchestration skills
│   └── .agents/
│       ├── skills/            # Universal skills
│       ├── rules/             # Universal rules
│       └── stacks/            # 27 technology stacks
├── sync.mjs                   # Sync engine
├── bootstrap.mjs              # Scaffold + sync for new projects
└── projects.json              # Registered project paths
```

## How Sync Works

When you run `agents-platform sync`, five layers apply in order:

| Layer | Source | Behavior | Purpose |
|-------|--------|----------|---------|
| 0. Global skills | `global/.agents/skills/` | Symlink to `~/.agents/skills/` | Tool-level skills (brainstorming, debugging, etc.) |
| 1. Tooling | `tooling/` | Always overwrites | Build scripts, renderers |
| 2. Scaffold | `scaffold/.agents/` | Skip existing | Project-level defaults (profile, templates) |
| 3. Shared universal | `shared/.agents/` (excl. stacks/) | Skip existing | Universal rules, skills |
| 4. Stacks | `shared/.agents/stacks/<name>/` | Always overwrites | Stack-specific content (excl. stack.toml) |

Global skills are symlinked, not copied — `~/.agents/skills/brainstorming` points to the platform's `global/.agents/skills/brainstorming`. If you symlink `~/.agents/skills/` into other tool directories (`~/.kiro/skills/`, `~/.claude/skills/`, etc.), all tools share the same skills from one source.

## Stacks

Each stack is a directory under `shared/.agents/stacks/` with skills, rules, and a `stack.toml` manifest:

```toml
[stack]
name = "laravel-api"
description = "Laravel API patterns and conventions"
category = "core"
requires = []
```

Projects opt in via `profile.toml`:

```toml
stacks = ["laravel-api", "bouncer", "neon-eloquent"]
```

Stack dependencies are validated at sync time — if `bouncer` requires `laravel-api` and it's missing, you get a warning.

Run `agents-platform list-stacks` to see all 27 stacks with their dependencies.

## Renderers

Renderers transform `.agents/` content into tool-specific config files. They're auto-discovered — drop a `.mjs` file in `tooling/renderers/` that exports `meta` and a render function, and it works.

See `tooling/renderers/CONTRIBUTING.md` for the full contract.

```bash
agents-platform list-renderers   # Show all renderers with capabilities
```

## Managed Projects

| Project | Description | Stacks |
|---------|-------------|--------|
| LivestockAI | Livestock management | TanStack Start, Kysely, Neon, CF Workers |
| ProjAvi | Project management | Laravel, TanStack, Flutter, Neon, CF |
| DeliveryNexus | Delivery logistics | Laravel, TanStack Start, Flutter, Neon, CF |
| Eweko | Agriculture/farming | TanStack Start, Kysely, Neon, CF Workers |

All projects are at 10/10 quality — full personas, runbook commands, decision-guided skills, institutional memory, and structured delegation.

## Adding a New Project

```bash
# 1. Bootstrap
agents-platform init ~/projects/new-app --toolchains kiro,claude

# 2. Register in projects.json
# 3. Fill <!-- PROJECT: --> placeholders in templates
# 4. Declare stacks in .agents/profile.toml
# 5. Build
cd ~/projects/new-app && bun .agents/scripts/build.mjs
```

## Adding a New Stack

```bash
agents-platform add-stack prisma
```

Creates `shared/.agents/stacks/prisma/` with `skills/`, `rules/`, and `stack.toml`. Add content, then declare it in project `profile.toml` files.

## Global Skills

The platform manages 26 tool-level skills (workflow, code quality, agent orchestration) that live at `~/.agents/skills/` via symlinks. These are shared across all AI tools by symlinking from each tool's skills directory:

```
~/.kiro/skills/brainstorming     → ~/.agents/skills/brainstorming → agents-platform/global/...
~/.claude/skills/brainstorming   → ~/.agents/skills/brainstorming → agents-platform/global/...
~/.factory/skills/brainstorming  → ~/.agents/skills/brainstorming → agents-platform/global/...
```

`agents-platform sync` creates the `~/.agents/skills/` symlinks automatically. The tool-directory symlinks (`~/.kiro/skills/` → `~/.agents/skills/`) are set up once manually.

If a real (non-symlink) directory exists in `~/.agents/skills/`, sync won't touch it — your custom skills are safe.

## Testing

```bash
bun test
```
