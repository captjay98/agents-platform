---
description: 'Debug Cloudflare Workers/Pages issues'
---

@devops-engineer Debug Cloudflare issue: $ARGUMENTS

## Diagnostic Steps

1. **Tail logs**: `npx wrangler tail` — watch live requests and errors.
2. **Check bindings**: Are KV/D1/R2 bindings correct in `wrangler.toml`?
3. **Check secrets**: `npx wrangler secret list` — are all secrets set?
4. **Check routes**: Is the route pattern matching correctly?
5. **Local repro**: `npx wrangler dev` — can you reproduce locally?

## Common Issues

- **"No such module"**: Check that imports work in Workers runtime (no Node.js APIs).
- **504 timeout**: Workers have a 30s CPU limit. Check for expensive operations.
- **Binding errors**: Ensure environment names match between wrangler.toml and dashboard.

<!-- PROJECT: Add project-specific Cloudflare debugging steps -->
