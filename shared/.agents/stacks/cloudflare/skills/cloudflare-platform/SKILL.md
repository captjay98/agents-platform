---
name: cloudflare-platform
description: Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI, networking, and security. Use decision trees to find the right product for any Cloudflare development task.
---

# Cloudflare Platform

Use decision trees below to find the right product for any task. Your knowledge of Cloudflare APIs, types, limits, and pricing may be outdated — **prefer retrieval over pre-training**.

## Retrieval Sources

Fetch the **latest** information before citing specific numbers, API signatures, or configuration options.

| Source | How to retrieve | Use for |
|--------|----------------|---------|
| Cloudflare docs | `https://developers.cloudflare.com/` | Limits, pricing, API reference, compatibility dates |
| Workers types | `npm pack @cloudflare/workers-types` or `node_modules` | Type signatures, binding shapes |
| Wrangler config schema | `node_modules/wrangler/config-schema.json` | Config fields, binding shapes, allowed values |
| Product changelogs | `https://developers.cloudflare.com/changelog/` | Recent changes, deprecations |

When docs and pre-training disagree, **trust the docs**.

## Quick Decision Trees

### "I need to run code"

```
├─ Serverless functions at the edge → Workers
├─ Full-stack web app with Git deploys → Pages
├─ Stateful coordination / real-time → Durable Objects
├─ Long-running multi-step jobs → Workflows
├─ Run containers → Containers
├─ Multi-tenant (customers deploy code) → Workers for Platforms
├─ Scheduled tasks (cron) → Cron Triggers
├─ Lightweight edge logic (modify HTTP) → Snippets
├─ Process Worker execution events → Tail Workers
└─ Optimize latency to backend → Smart Placement
```

### "I need to store data"

```
├─ Key-value (config, sessions, cache) → KV
├─ Relational SQL → D1 (SQLite) or Hyperdrive (existing Postgres/MySQL)
├─ Object/file storage (S3-compatible) → R2
├─ Message queue (async processing) → Queues
├─ Vector embeddings (AI/semantic search) → Vectorize
├─ Strongly-consistent per-entity state → Durable Objects storage
├─ Secrets management → Secrets Store
├─ Streaming ETL to R2 → Pipelines
└─ Persistent cache (long-term retention) → Cache Reserve
```

### "I need AI/ML"

```
├─ Run inference (LLMs, embeddings, images) → Workers AI
├─ Vector database for RAG/search → Vectorize
├─ Build stateful AI agents → Agents SDK
├─ Gateway for any AI provider (caching, routing) → AI Gateway
└─ AI-powered search widget → AI Search
```

### "I need networking"

```
├─ Expose local service to internet → Tunnel
├─ TCP/UDP proxy (non-HTTP) → Spectrum
├─ WebRTC TURN server → TURN
├─ Private network connectivity → Network Interconnect
├─ Optimize routing → Argo Smart Routing
└─ Real-time video/audio → RealtimeKit / Realtime SFU
```

### "I need security"

```
├─ Web Application Firewall → WAF
├─ DDoS protection → DDoS
├─ Bot detection/management → Bot Management
├─ API protection → API Shield
├─ CAPTCHA alternative → Turnstile
└─ Credential leak detection → WAF (managed ruleset)
```

### "I need infrastructure-as-code"

```
├─ Pulumi → pulumi/
├─ Terraform → terraform/
└─ REST API → api/
```

## Product Quick Reference

### Compute
| Product | Use case |
|---------|----------|
| Workers | Serverless functions, API endpoints, middleware |
| Pages | Full-stack web apps with Git-based deploys |
| Durable Objects | Stateful coordination, chat, multiplayer, booking |
| Workflows | Long-running multi-step background jobs |
| Cron Triggers | Scheduled tasks on Workers |

### Storage
| Product | Use case | Consistency |
|---------|----------|-------------|
| KV | Config, sessions, cache | Eventually consistent |
| D1 | Relational data (SQLite at edge) | Strong (per-DB) |
| R2 | Files, media, backups (S3-compatible) | Strong |
| Queues | Async message processing | At-least-once delivery |
| Hyperdrive | Accelerate existing Postgres/MySQL | Proxied |

### Key Limits (verify against docs — these change)

| Resource | Limit |
|----------|-------|
| Worker CPU time (free) | 10ms |
| Worker CPU time (paid) | 30s |
| Worker memory | 128 MB |
| KV value size | 25 MB |
| KV key size | 512 bytes |
| R2 object size | 5 TB |
| D1 database size | 10 GB |
| Subrequest limit | 1000 per request |

## Common Patterns

### Workers + KV (caching)
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const cached = await env.CACHE.get(url.pathname)
    if (cached) return new Response(cached, { headers: { 'X-Cache': 'HIT' } })

    const data = await fetchFromOrigin(url.pathname)
    await env.CACHE.put(url.pathname, data, { expirationTtl: 3600 })
    return new Response(data)
  }
}
```

### Workers + R2 (file upload)
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'PUT') {
      const key = new URL(request.url).pathname.slice(1)
      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('content-type') ?? undefined }
      })
      return new Response(`Uploaded ${key}`, { status: 201 })
    }
    // ...
  }
}
```

### Workers + Queues (async processing)
```typescript
// Producer
await env.MY_QUEUE.send({ type: 'email', to: user.email, template: 'welcome' })

// Consumer
export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      await processMessage(msg.body, env)
      msg.ack()
    }
  }
}
```
