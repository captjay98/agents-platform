---
name: cloudflare-workers
description: Production best practices for Cloudflare Workers. Use when writing, reviewing, or debugging Workers code — covers configuration, streaming, error handling, security, and common anti-patterns.
---

# Cloudflare Workers Best Practices

**Prefer retrieval over pre-training** for any Workers code task. Fetch the latest best practices before writing or reviewing:

```
https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
```

## Configuration Rules

| Rule | Detail |
|------|--------|
| Compatibility date | Set `compatibility_date` to today on new projects; update periodically |
| nodejs_compat | Enable `nodejs_compat` flag — many libraries depend on Node.js built-ins |
| wrangler types | Run `wrangler types` to generate `Env` — never hand-write binding interfaces |
| Secrets | Use `wrangler secret put` — never hardcode secrets in config or source |
| wrangler.jsonc | Use JSONC config — newer features are JSON-only |

## Request & Response Rules

| Rule | Detail |
|------|--------|
| Streaming | Stream large/unknown payloads — never `await response.text()` on unbounded data |
| waitUntil | Use `ctx.waitUntil()` for post-response work; do not destructure `ctx` |
| Bindings over REST | Use in-process bindings (KV, R2, D1, Queues) — not the Cloudflare REST API |
| Service bindings | Use service bindings for Worker-to-Worker calls — not public HTTP |
| Hyperdrive | Always use Hyperdrive for external PostgreSQL/MySQL connections |

## Code Pattern Rules

| Rule | Detail |
|------|--------|
| No global request state | Never store request-scoped data in module-level variables |
| Floating promises | Every Promise must be `await`ed, `return`ed, `void`ed, or passed to `ctx.waitUntil()` |
| Web Crypto | Use `crypto.randomUUID()` / `crypto.getRandomValues()` — never `Math.random()` for security |
| No passThroughOnException | Use explicit try/catch with structured error responses |
| Observability | Enable `observability` in config with `head_sampling_rate`; use structured JSON logging |

## Anti-Patterns

| Anti-pattern | Why |
|-------------|-----|
| `await response.text()` on unbounded data | Memory exhaustion — 128 MB limit |
| Hardcoded secrets in source or config | Credential leak via version control |
| `Math.random()` for tokens/IDs | Predictable, not cryptographically secure |
| Bare `fetch()` without `await` or `waitUntil` | Floating promise — dropped result, swallowed error |
| Module-level mutable variables for request state | Cross-request data leaks, stale state |
| Cloudflare REST API from inside a Worker | Unnecessary network hop, auth overhead, latency |
| `ctx.passThroughOnException()` as error handling | Hides bugs, makes debugging impossible |
| Hand-written `Env` interface | Drifts from actual wrangler config bindings |
| Direct string comparison for secrets | Timing side-channel — use `crypto.subtle.timingSafeEqual` |
| Destructuring `ctx` (`const { waitUntil } = ctx`) | Loses `this` binding — throws "Illegal invocation" |
| `any` on `Env` or handler params | Defeats type safety for all binding access |
| `implements` on platform base classes | Legacy — loses `this.ctx`, `this.env`. Use `extends` |

## Correct Patterns

### Error handling
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handleRequest(request, env, ctx)
    } catch (err) {
      console.error('Unhandled error:', err)
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
```

### Streaming response
```typescript
const response = await fetch(upstreamUrl)
// GOOD: stream through without buffering
return new Response(response.body, { headers: response.headers })

// BAD: buffers entire response into memory
// const text = await response.text()
// return new Response(text)
```

### Post-response work
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const data = await getData(env)
    // Fire-and-forget analytics AFTER response
    ctx.waitUntil(env.ANALYTICS_QUEUE.send({ path: new URL(request.url).pathname }))
    return Response.json(data)
  }
}
```

### Timing-safe secret comparison
```typescript
async function verifyToken(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const a = enc.encode(provided)
  const b = enc.encode(expected)
  if (a.byteLength !== b.byteLength) return false
  return crypto.subtle.timingSafeEqual(a, b)
}
```

## Review Checklist

1. **Config** — compatibility_date set? nodejs_compat enabled? observability on? secrets via `wrangler secret`?
2. **Types** — `wrangler types` generated? No `any` on Env? No hand-written binding interfaces?
3. **Streaming** — large payloads streamed? No `await response.text()` on unbounded data?
4. **Promises** — every Promise awaited, returned, voided, or in `waitUntil()`?
5. **State** — no module-level mutable variables for request data?
6. **Security** — `crypto.subtle` for secrets? No `Math.random()` for tokens? No hardcoded secrets?
7. **Bindings** — using in-process bindings, not REST API? Service bindings for Worker-to-Worker?
