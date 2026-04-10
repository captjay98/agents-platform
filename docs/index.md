---
layout: default
title: agents-platform
---

# agents-platform

**A complete AI agent configuration system for multi-project workspaces.**

Distribute skills, personas, commands, rules, and project context to AI agents — scoped to each project's tech stack. Supports Claude, Kiro, Gemini, OpenCode, and Factory.

---

## The Problem

You have multiple projects with different tech stacks. AI agents give generic advice because they don't know your conventions, architecture, or team roles. Manually configuring each project leads to drift, duplication, and stale patterns.

## The Solution

```
agents-platform (central hub)
     │
     ├── 154 project skills    (76 auto-updated from open-source repos)
     ├── 22 global skills      (workflow, quality, research — all tools)
     ├── 9 personas            (role-based agent identities)
     ├── 27 commands           (19 universal + 8 stack-scoped)
     ├── 31 rules              (7 shared + 3 scaffold + 21 stack-scoped)
     ├── 5 renderers           (Claude, Kiro, Gemini, OpenCode, Factory)
     ├── 5 global MCP servers  (sequential-thinking, tavily, Context7, semgrep, exa)
     ├── 30 stacks             (technology-specific bundles)
     │
     └── sync ──► Project A (picks stacks → gets matching config)
                  Project B (different stacks → different config)
```

## What Gets Distributed

| Component | What it does |
|-----------|-------------|
| **Skills** | Technical knowledge — patterns, conventions, integrations |
| **Personas** | Role-based identities: backend-engineer, frontend-engineer, qa-engineer, etc. |
| **Commands** | Executable workflows: code-review, deploy, migrate, debug, incident-commander |
| **Rules** | Coding constraints: git-safety, guard-clauses, no-todos, stack-specific rules |
| **Steering** | Project context: product map, tech stack, coding standards, testing guidelines |
| **Hooks** | Safety guardrails: conventional commits, branch protection, lockfile protection |
| **Memory** | Institutional knowledge that persists across sessions |
| **Global MCP** | MCP servers shared across all AI tools (reasoning, search, security) |

## Supported AI Tools

| Tool | Renderer | Output |
|------|----------|--------|
| Claude Code | `claude.mjs` | `.claude/CLAUDE.md` + skills |
| Kiro | `kiro.mjs` | `.kiro/` + subagent templates |
| Gemini | `gemini.mjs` | `.gemini/` (reads `.agents/` directly) |
| OpenCode | `opencode.mjs` | `.opencode/` + `opencode.json` |
| Factory | `factory.mjs` | `.factory/FACTORY.md` + skills |

Renderers are pluggable — drop a `.mjs` file in `tooling/renderers/`.

## Personas

9 role-based personas with distinct expertise and delegation patterns:

`backend-engineer` · `frontend-engineer` · `fullstack-engineer` · `devops-engineer` · `security-engineer` · `qa-engineer` · `product-architect` · `data-analyst` · `mobile-engineer`

## Commands

27 executable workflows. 19 universal (all projects) + 8 stack-scoped (only matching projects):

**Universal:** code-review, debug, migrate, refactor, dependency-update, commit-plan, execute, plan-feature, prime, quickstart, release-readiness, test-coverage, ui-audit, accessibility-audit, incident-commander, performance-audit, sync-docs, neon-setup, update-devlog

**Stack-scoped:** cloudflare-deploy/debug/setup (cloudflare stack), sentry-setup/triage (sentry stack), laravel-cloud-deploy/debug/setup (laravel-cloud stack)

## Global MCP

5 MCP servers managed by the platform, synced to all 5 AI tools:

`sequential-thinking` · `tavily` · `Context7` · `semgrep` · `exa`

Add/remove a server in `global/.agents/mcp/servers.json` → sync propagates to all tools.

## Stacks

30 technology stacks. Projects opt in via `profile.toml`:

`tanstack-fullstack` · `tanstack-frontend` · `laravel-api` · `nextjs` · `nestjs` · `flutter` · `cloudflare` · `sentry` · `tailwind` · `better-auth` · `neon-kysely` · `neon-eloquent` · `typeorm` · `bullmq` · `firebase` · `payments-laravel` · `payments-typescript` · `payments-nestjs` · `laravel-cloud` · `laravel-reverb` · `laravel-horizon` · `spatie` · `bouncer` · `meilisearch` · `zustand` · `tiptap` · `cloudinary` · `resend` · `capacitor` · `maps`

## Upstream Sources

76 skills auto-updated from open-source repos:

[Sentry](https://github.com/getsentry/sentry-for-ai) · [Cloudflare](https://github.com/cloudflare/skills) · [Vercel](https://github.com/vercel-labs/next-skills) · [TanStack](https://github.com/tanstack/agent-skills) · [Anthropic](https://github.com/anthropics/skills) · [Laravel](https://github.com/iSerter/laravel-claude-agents) · [Firebase](https://github.com/nicholasgriffintn/firebase-agent-skills) · [shadcn/ui](https://github.com/shadcn-ui/ui) · [Neon](https://github.com/neondatabase/agent-skills) · [sergiodxa](https://github.com/sergiodxa/agent-skills) · [ibelick](https://github.com/ibelick/ui-skills)

## Quick Start

```bash
git clone <repo-url> && cd agents-platform
bun install && bun link

# Interactive setup
agents-platform setup ~/projects/my-app

# Or agent-friendly (no prompts)
agents-platform setup ~/projects/my-app --auto

# Check health
agents-platform status
```

## Numbers

| | |
|---|---|
| **Project skills** | 154 (76 upstream + 78 custom) |
| **Global skills** | 22 (21 upstream + 1 custom) |
| **Personas** | 9 role-based identities |
| **Commands** | 27 (19 universal + 8 stack-scoped) |
| **Rules** | 31 (7 shared + 3 scaffold + 21 stack) |
| **Stacks** | 30 technology bundles |
| **Renderers** | 5 AI tools supported |
| **Global MCP** | 5 servers across all tools |

---

[View on GitHub](https://github.com/captjay98/agents-platform) · [Contributing](https://github.com/captjay98/agents-platform/blob/main/CONTRIBUTING.md)
