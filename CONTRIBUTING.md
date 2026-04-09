# Contributing to agents-platform

## Overview

agents-platform distributes AI agent skills to projects based on their tech stacks. Contributions fall into three categories:

1. **New or improved custom skills** — patterns, conventions, integrations
2. **New stacks** — support for additional technologies
3. **Tooling improvements** — sync engine, renderers, CLI

## Writing Skills

### Structure

```
shared/.agents/stacks/<stack>/skills/<skill-name>/
└── SKILL.md          # Required — the skill content
```

### SKILL.md Format

```markdown
---
name: my-skill
description: One sentence — when to use this skill.
---

# Skill Title

## Section (CRITICAL|HIGH|MEDIUM)

Explanation with code examples.

## Rules

- Bullet list of do/don't rules
```

### Quality Checklist

- [ ] Has frontmatter with `name` and `description`
- [ ] Code examples are syntactically correct
- [ ] No project-specific references (use generic examples)
- [ ] Has a `## Rules` section with actionable constraints
- [ ] Placed in the correct stack directory
- [ ] Name doesn't clash with existing skills (`bun update-skills.mjs --list`)

### Priority Tags

Use `(CRITICAL)`, `(HIGH)`, or `(MEDIUM)` after section headers to signal importance to agents.

### Shared vs Stack-Scoped

| Put in `shared/.agents/skills/` if... | Put in `shared/.agents/stacks/<stack>/skills/` if... |
|---|---|
| Every project benefits (a11y, testing, migrations) | Only projects with that stack need it |
| Framework-agnostic patterns | Framework-specific patterns |
| Universal conventions | Technology-specific conventions |

## Adding Upstream Skills

To add a skill from an open-source repo:

```bash
# 1. Install to a temp dir to inspect
tmpdir=$(mktemp -d) && cd "$tmpdir"
npx skills add <owner>/<repo> --all --yes
ls .agents/skills/

# 2. Copy to the right location
cp -r .agents/skills/<skill-name> /path/to/agents-platform/shared/.agents/skills/
# or for stack-scoped:
cp -r .agents/skills/<skill-name> /path/to/agents-platform/shared/.agents/stacks/<stack>/skills/

# 3. Register in manifest
# Edit shared/.agents/skills-manifest.json:
{
  "<skill-name>": {
    "source": "<owner>/<repo>",
    "skill": "<skill-name>",
    "target": "skills",          // or "stacks/<stack>"
    "method": "npx-skills",
    "installed": "2026-04-09"
  }
}

# 4. Sync to projects
bun sync.mjs --all
```

## Adding a New Stack

```bash
agents-platform add-stack <name>
```

Then:
1. Edit `shared/.agents/stacks/<name>/stack.toml` — set description and `requires`
2. Add skills to `shared/.agents/stacks/<name>/skills/`
3. Add rules to `shared/.agents/stacks/<name>/rules/` (optional)
4. Declare the stack in project `profile.toml` files
5. Run `bun sync.mjs --all`

## Adding a New Renderer

Renderers live in `tooling/renderers/`. Create a `.mjs` file that exports:

```javascript
export const meta = {
  name: 'my-tool',
  description: 'Renders for My AI Tool',
  outputDir: '.my-tool',
  capabilities: ['skills', 'rules'],
}

export function render(agents, options) {
  // Return array of { path, content } objects
}
```

See `tooling/renderers/CONTRIBUTING.md` for the full contract.

## Workflow

```bash
# 1. Make changes
# 2. Sync to projects
bun sync.mjs --all

# 3. Verify in a project
cd ~/projects/<project> && bun .agents/scripts/build.mjs

# 4. Commit
cd ~/projects/agents-platform
git add -A && git commit -m "feat: <description>"

# 5. Commit project changes
for repo in livestockai projavi deliverynexus eweko; do
  cd ~/projects/$repo
  git add .agents/ && git commit -m "chore: sync agents-platform"
done
```

## Updating Upstream Skills

```bash
# Update all 76 upstream skills from their source repos
bun update-skills.mjs --all

# Check for failures
# Then sync to projects
bun sync.mjs --all
```

## Rules for Contributors

- **No project-specific content in platform skills** — use generic examples. Project-specific patterns belong in local project skills.
- **No name clashes** — check `bun update-skills.mjs --list` before naming a skill.
- **Stack-scope by default** — only put skills in `shared/.agents/skills/` if truly universal.
- **Test code examples** — every code snippet should be syntactically correct.
- **One skill per concern** — don't combine unrelated patterns in one SKILL.md.
- **Keep skills under 300 lines** — if longer, split into a SKILL.md + `references/` directory.
