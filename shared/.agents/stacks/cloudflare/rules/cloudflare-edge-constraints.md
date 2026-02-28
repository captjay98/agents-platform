---
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/wrangler.jsonc"
  - "**/wrangler.toml"
alwaysApply: false
---

# Cloudflare Edge Runtime Constraints

Code running on Cloudflare Workers operates in a V8 isolate, not Node.js. Respect these constraints:

## Memory & CPU
- **128 MB memory limit** — stream large payloads, never buffer unbounded data
- **10ms CPU (free) / 30s CPU (paid)** — offload heavy work to Queues or Workflows
- **1000 subrequests per request** — batch external calls where possible

## No Node.js Globals
- No `fs`, `path`, `child_process`, `net`, `dgram`
- Enable `nodejs_compat` flag for polyfilled modules (`crypto`, `buffer`, `stream`, `util`)
- Use Web APIs: `fetch`, `Request`, `Response`, `URL`, `crypto`, `TextEncoder`

## No Global Mutable State
- Module-level variables persist across requests within the same isolate
- Never store request-scoped data (user, session, auth) in module-level variables
- Use `ctx` parameter or function arguments to pass request context

## Async Rules
- Every `Promise` must be `await`ed, `return`ed, or passed to `ctx.waitUntil()`
- Never destructure `ctx` — loses `this` binding
- Use `ctx.waitUntil()` for fire-and-forget work after response

## Security
- Use `crypto.randomUUID()` and `crypto.getRandomValues()` — never `Math.random()`
- Use `crypto.subtle.timingSafeEqual` for secret comparison — never `===`
- Use `wrangler secret put` — never hardcode secrets
