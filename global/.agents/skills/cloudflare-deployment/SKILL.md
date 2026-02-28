---
name: cloudflare-deployment
description: Cloudflare Workers deployment patterns for edge-ready applications
---

## Pre-Deployment Checklist

1. **Secrets configured**:

   ```bash
   wrangler secret put DATABASE_URL
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put BETTER_AUTH_URL
   ```

2. **Local testing**:

   ```bash
   wrangler dev  # Test locally first
   ```

3. **Build succeeds**:
   ```bash
   bun run build  # Check for errors
   ```

## Deployment Commands

```bash
# Deploy to production
bun run deploy
# or
wrangler deploy

# View logs
wrangler tail

# Check deployment status
wrangler deployments list
```

## Critical Configuration

### wrangler.jsonc

- `nodejs_compat` flag enabled
- Bundle size under 1MB
- Correct compatibility date

### Environment Variables

- `DATABASE_URL`: Neon connection string with `?sslmode=require`
- `BETTER_AUTH_SECRET`: 32+ characters
- `BETTER_AUTH_URL`: Production domain (e.g., `https://app.example.com`)

## Common Issues

### "Cannot find module" errors

- Use dynamic imports: `const { db } = await import('~/lib/db')`
- Check for Node.js APIs that need polyfills

### Cold start latency

- Minimize bundle size
- Use Haiku for read-only operations

### Database connection errors

- Verify `DATABASE_URL` secret is set
- Check Neon project is active (not suspended)
- Ensure `?sslmode=require` in connection string

## Post-Deployment Verification

1. Check logs: `wrangler tail`
2. Test critical paths (auth, dashboard)
3. Monitor error rates
4. Verify database connections work
