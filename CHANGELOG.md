# Changelog

All notable changes to agents-platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-28

Initial release — stack-based AI agent configuration system.

### Platform

- **CLI**: `bin/agents-platform.mjs` with init, sync, build, lint, signoff, validate, add-stack, list-stacks, list-projects, list-renderers
- **Sync engine**: 4-layer sync (tooling → scaffold → shared universal → stacks) with dry-run support
- **Pluggable renderers**: Auto-discovered from `tooling/renderers/*.mjs` — Claude, Kiro, Gemini, OpenCode, Factory
- **TOML config**: `profile.toml` for project toolchains/stacks, `stack.toml` for stack manifests with dependency declarations
- **Stack dependency validation**: Warns when required stacks are missing from profile
- **Bun-first**: All scripts use `#!/usr/bin/env bun`

### Content

- **27 stacks**: laravel-api, nestjs, tanstack-fullstack, cloudflare, neon-kysely, neon-eloquent, bouncer, spatie, better-auth, bullmq, typeorm, laravel-horizon, laravel-reverb, payments, and more
- **Scaffold**: 9 personas, 21 commands, 9 rules, 10 steering docs, 4 skills, memory template, delegation pattern
- **Personas**: 80-140 lines with autonomous instructions, communication style, code patterns, delegation priorities
- **Commands**: Runbook-quality with protocols, verification steps, GO/NO-GO criteria
- **Skills**: Decision Guide sections (use when / don't use when / decision tree / failure modes)
- **Rules**: Frontmatter with trigger and globs fields

### Managed Projects (all 10/10 quality)

| Project | Personas | Commands | Skills | Rules |
|---------|----------|----------|--------|-------|
| LivestockAI | 11 | 21 | 54 | 18 |
| ProjAvi | 10 | 26 | 78 | 29 |
| DeliveryNexus | 12 | 26 | 60 | 24 |
| Eweko | 9 | 21 | 40 | 15 |
