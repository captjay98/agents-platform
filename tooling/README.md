# Tooling

Canonical build scripts synced to all projects. These generate `AGENTS.md` and toolchain-specific configs.

## Scripts

| Script | Purpose |
|--------|---------|
| `build.mjs` | Generate AGENTS.md from .agents/ content |
| `verify.mjs` | Validate .agents/ structure and content |
| `lint.mjs` | Lint agent content for quality issues |
| `config.mjs` | Shared configuration helpers |
| `toolchains.mjs` | Toolchain definitions (claude, kiro, gemini, opencode, factory) |
| `agents.mjs` | Agent content reader |
| `signoff.mjs` | Sign-off workflow for releases |
| `check-mcp.mjs` | MCP server validation |
| `mcp-smoke.mjs` | MCP smoke tests |

## Renderers

Each AI toolchain has a custom renderer in `renderers/`:

- `claude.mjs` — Claude Desktop format
- `kiro.mjs` — Kiro CLI format
- `gemini.mjs` — Google Gemini format
- `opencode.mjs` — OpenCode format
- `factory.mjs` — Factory format
- `common.mjs` — Shared rendering utilities

## Sync Behavior

Tooling is **always synced** to projects:

```bash
node sync.mjs --all
```

Copies `tooling/*` → `<project>/.agents/scripts/` (overwrites existing).

Projects run tooling locally:

```bash
cd ~/projects/my-app
bun .agents/scripts/build.mjs
```

## Editing Tooling

1. Edit files in `agents-platform/tooling/`
2. Run `node sync.mjs --all` to push to projects
3. Test in a project: `cd ~/projects/livestockai && bun .agents/scripts/build.mjs`
4. Commit changes to agents-platform

## Build Process

`build.mjs` workflow:

1. Read `.agents/profile.toml` to determine enabled toolchains
2. Load content from `.agents/` (commands, skills, personas, rules, steering)
3. For each enabled toolchain:
   - Call renderer (e.g., `renderers/claude.mjs`)
   - Generate toolchain-specific output
4. Write `AGENTS.md` to project root
5. Write toolchain configs (e.g., `.kiro/agents.json`)

## Adding a New Toolchain

1. Create `renderers/<toolchain>.mjs`
2. Implement `render(content, config)` function
3. Add toolchain to `toolchains.mjs`
4. Projects opt-in via `profile.toml`: `toolchains = ["claude", "kiro", "new-toolchain"]`
