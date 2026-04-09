---
description: 'Configure Cloudflare Workers/Pages for this project'
---

@devops-engineer Set up Cloudflare: $ARGUMENTS

## Protocol

1. Verify `wrangler` is installed: `npx wrangler --version`
2. Check/create `wrangler.toml` configuration.
3. Set up environment bindings (KV, D1, R2 as needed).
4. Configure custom domain and routes.
5. Set secrets: `npx wrangler secret put <NAME>`

<!-- PROJECT: Your specific wrangler.toml settings, bindings, and domain config -->

## Verification

```bash
npx wrangler deploy --dry-run
```
