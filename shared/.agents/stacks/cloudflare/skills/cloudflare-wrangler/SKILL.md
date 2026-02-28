---
name: cloudflare-wrangler
description: Wrangler CLI reference for deploying, developing, and managing Workers, KV, R2, D1, Queues, and other Cloudflare resources. Use before running wrangler commands.
---

# Wrangler CLI

Deploy, develop, and manage Cloudflare Workers and resources. Requires v4.x+.

## Key Guidelines

- **Use `wrangler.jsonc`** — prefer JSON config over TOML. Newer features are JSON-only.
- **Set `compatibility_date`** — use a recent date (within 30 days).
- **Run `wrangler types` after config changes** — generates TypeScript bindings.
- **Local dev defaults to local storage** — bindings use local simulation unless `remote: true`.
- **Use `.dev.vars` for local secrets** — never commit secrets to config.

## Core Commands

| Task | Command |
|------|---------|
| Start local dev | `wrangler dev` |
| Deploy | `wrangler deploy` |
| Deploy dry run | `wrangler deploy --dry-run` |
| Generate types | `wrangler types` |
| Validate config | `wrangler check` |
| View live logs | `wrangler tail` |
| Auth status | `wrangler whoami` |

## Configuration (wrangler.jsonc)

### Minimal
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01"
}
```

### With Bindings
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat_v2"],
  "vars": { "ENVIRONMENT": "production" },
  "kv_namespaces": [{ "binding": "KV", "id": "<ID>" }],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-bucket" }],
  "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "<ID>" }],
  "observability": { "enabled": true, "head_sampling_rate": 1 },
  "env": {
    "staging": { "name": "my-worker-staging", "vars": { "ENVIRONMENT": "staging" } }
  }
}
```

## Local Development

```bash
wrangler dev                    # Local mode (default)
wrangler dev --env staging      # Specific environment
wrangler dev --port 8787        # Custom port
wrangler dev --test-scheduled   # Test cron handlers → visit /__scheduled
```

Remote bindings for local dev (AI, Vectorize, Browser Rendering always need remote):
```jsonc
{ "ai": { "binding": "AI", "remote": true } }
```

Local secrets in `.dev.vars`:
```
API_KEY=local-dev-key
DATABASE_URL=postgres://localhost:5432/dev
```

## Secrets Management

```bash
wrangler secret put API_KEY              # Set interactively
echo "value" | wrangler secret put KEY   # Set from stdin
wrangler secret list                     # List secrets
wrangler secret bulk secrets.json        # Bulk from JSON
```

## Deployment

```bash
wrangler deploy                  # Production
wrangler deploy --env staging    # Specific environment
wrangler deploy --dry-run        # Validate only
wrangler deploy --keep-vars      # Keep dashboard-set variables
```

### Versions & Rollback
```bash
wrangler versions list
wrangler rollback                # Previous version
wrangler rollback <VERSION_ID>   # Specific version
```

## KV

```bash
wrangler kv namespace create MY_KV
wrangler kv key put --namespace-id <ID> "key" "value"
wrangler kv key put --namespace-id <ID> "key" "value" --expiration-ttl 3600
wrangler kv key get --namespace-id <ID> "key"
wrangler kv key list --namespace-id <ID>
wrangler kv bulk put --namespace-id <ID> data.json
```

## R2

```bash
wrangler r2 bucket create my-bucket
wrangler r2 bucket create my-bucket --location wnam
wrangler r2 object put my-bucket/path/file.txt --file ./local.txt
wrangler r2 object get my-bucket/path/file.txt
```

## D1

```bash
wrangler d1 create my-database
wrangler d1 execute my-database --remote --command "SELECT * FROM users"
wrangler d1 execute my-database --remote --file ./schema.sql
wrangler d1 migrations create my-database create_users
wrangler d1 migrations apply my-database --remote
wrangler d1 export my-database --remote --output backup.sql
```

## Queues

```bash
wrangler queues create my-queue
wrangler queues consumer add my-queue my-worker
```

Config:
```jsonc
{
  "queues": {
    "producers": [{ "binding": "MY_QUEUE", "queue": "my-queue" }],
    "consumers": [{ "queue": "my-queue", "max_batch_size": 10 }]
  }
}
```

## Pages

```bash
wrangler pages project create my-site
wrangler pages deploy ./dist
wrangler pages deploy ./dist --branch main
```

## Observability

```bash
wrangler tail                    # Stream live logs
wrangler tail --status error     # Filter errors
wrangler tail --format json      # JSON output
```

## Testing with Vitest

```bash
npm install -D @cloudflare/vitest-pool-workers vitest
```

```typescript
// vitest.config.ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config"
export default defineWorkersConfig({
  test: {
    poolOptions: { workers: { wrangler: { configPath: "./wrangler.jsonc" } } }
  }
})
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `command not found: wrangler` | `npm install -D wrangler` |
| Auth errors | `wrangler login` |
| Config validation errors | `wrangler check` |
| Type errors after config change | `wrangler types` |
| Binding undefined in Worker | Verify binding name matches config exactly |
