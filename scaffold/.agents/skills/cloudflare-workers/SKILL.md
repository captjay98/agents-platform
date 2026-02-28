---
name: cloudflare-workers
description: Edge deployment patterns and Cloudflare-specific constraints
---

# Cloudflare Workers

<!-- PROJECT: What you deploy to CF (frontend, API, both?) -->

## Key Constraints

- No `process.env` — use wrangler secrets and bindings
- No Node.js-only APIs (fs, path, etc.)
- Bundle size limits apply
- Cold starts matter for latency-sensitive paths

## Deployment

- Config: `wrangler.jsonc` or `wrangler.toml`
- Deploy: `npx wrangler deploy`
- Secrets: `npx wrangler secret put KEY`
- Logs: `npx wrangler tail`

<!-- PROJECT: Your specific bindings, routes, and deployment patterns -->

## Decision Guide

**Use when:**
- Deploying to Cloudflare Workers/Pages
- Debugging Workers runtime issues
- Configuring bindings (KV, D1, R2, Queues)

**Don't use when:**
- Deploying to other platforms (Vercel, AWS, etc.)
- Working on code that doesn't touch the edge runtime

**Decision tree:**
- Using Node.js API? → Find Workers-compatible alternative
- Need env vars? → Use `wrangler secret` not `.env`
- Bundle too large? → Tree-shake, lazy import, or split into multiple Workers
- Cold start too slow? → Check for heavy top-level imports

**Failure modes:**
- Static imports of large modules → bundle size explosion
- `process.env` usage → undefined at runtime
- Node.js APIs (fs, path) → runtime crash
