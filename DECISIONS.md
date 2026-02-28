# Architecture Decisions

How agents-platform is built and why.

## Layered Sync

Four layers apply in order when syncing to a project:

1. **Tooling** → always overwrites (platform owns build scripts and renderers)
2. **Scaffold** → skip existing (project owns its templates once bootstrapped)
3. **Shared universal** → skip existing (project can customize universal rules/skills)
4. **Stack content** → always overwrites (stacks are platform-canonical, kept consistent across projects)

This means projects control their own personas, commands, and steering docs, but stack-specific skills and rules stay in sync with the platform.

## Stacks Over Flat Content

All shared content is organized by technology stack (`shared/.agents/stacks/<name>/`). Projects declare which stacks they use in `profile.toml`. Only selected stacks sync.

Laravel projects don't get NestJS skills. PWA projects don't get Flutter skills. Each stack has a `stack.toml` manifest with dependency declarations — if `bouncer` requires `laravel-api` and it's missing, sync warns you.

## Stack Category via Manifest

All stacks live in one directory. Category is a field in `stack.toml`, not a directory split:

```toml
[stack]
category = "community"  # or "core" (default)
```

One directory to look in, one resolution path, same sync behavior regardless of category.

## Pluggable Renderer Discovery

Renderers are auto-discovered by scanning `tooling/renderers/*.mjs`. Each exports `meta` and a render function. Adding a new AI tool = creating one file. No registration, no config changes.

`toolchains.mjs` uses dynamic imports with top-level await. `build.mjs` builds the renderer map from discovered modules.

## No Per-Stack Versioning

Platform version covers everything. One tag, one release. Stacks are tightly coupled to the sync engine and renderer contract — independent versioning adds complexity without value.

## Bun-First

All scripts use `#!/usr/bin/env bun`. Package.json scripts use `bun test`. Bun is the runtime for all managed projects — faster startup, native TypeScript, built-in test runner.

## CLI as Thin Wrapper

`bin/agents-platform.mjs` delegates to existing scripts via `spawnSync`. It doesn't duplicate logic — `bun sync.mjs --all` and `agents-platform sync` do the same thing. The CLI is a convenience layer that routes commands.

## Global Skills via Symlinks

Tool-level skills (brainstorming, systematic-debugging, writing-plans, etc.) aren't project-specific — they belong at the user level, not inside each project. The platform stores them in `global/.agents/skills/` and symlinks them into `~/.agents/skills/`.

Symlinks instead of copies because: no duplication, platform updates are instant, and the user can chain symlinks from `~/.kiro/skills/`, `~/.claude/skills/`, etc. into `~/.agents/skills/` so all tools share one source of truth.

Real directories in `~/.agents/skills/` are never overwritten — same "owner wins" principle as project content.

## Deep Personas (80-140 Lines)

Every persona includes autonomous instructions, communication style, real code patterns with file paths, critical constraints, and delegation priorities. Generic personas produce generic output — depth produces project-appropriate code.

## Commands as Runbooks

Key commands are executable procedures with actual commands, expected outputs, and GO/NO-GO criteria. Not prompts — runbooks. Agents can verify success at each step.

## Skills with Decision Triggers

Every high-stakes skill includes a Decision Guide: use when / don't use when / decision tree / failure modes. Skills explain "when" and "why not", not just "how".
