---
name: sentry-setup
description: Initial Sentry project setup — DSN configuration, environment variables, source maps CI pipeline, and Sentry CLI. Use when bootstrapping Sentry in a new project.
---

# Sentry Setup

Baseline setup for any project using Sentry. For SDK-specific integration, see `sentry-react-sdk` or `sentry-nextjs-sdk`.

## Prerequisites

- Sentry account and project created at [sentry.io](https://sentry.io)
- DSN from project settings → Client Keys

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `SENTRY_DSN` | Server runtime | SDK initialization |
| `NEXT_PUBLIC_SENTRY_DSN` or `VITE_SENTRY_DSN` | Client bundle | Browser SDK init (public, safe to expose) |
| `SENTRY_AUTH_TOKEN` | CI/build only | Source map upload (secret — never commit) |
| `SENTRY_ORG` | CI/build | Organization slug |
| `SENTRY_PROJECT` | CI/build | Project slug |

Store `SENTRY_AUTH_TOKEN` in CI secrets (GitHub Actions, Cloudflare Pages, etc.), never in `.env` files committed to git.

## Source Maps CI Pipeline

Source maps make production stack traces readable. Without them, you see minified code.

### Generate Auth Token
1. Go to [sentry.io/settings/auth-tokens/](https://sentry.io/settings/auth-tokens/)
2. Create token with `project:releases` and `org:read` scopes
3. Add to CI secrets as `SENTRY_AUTH_TOKEN`

### Vite Projects
```typescript
// vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin"

export default defineConfig({
  build: { sourcemap: "hidden" },
  plugins: [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
})
```

### Next.js Projects
```typescript
// next.config.ts
import { withSentryConfig } from "@sentry/nextjs"

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
})
```

### GitHub Actions Example
```yaml
- name: Build with source maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: my-org
    SENTRY_PROJECT: my-project
  run: npm run build
```

## Sentry CLI

Install for local debugging and CI automation:

```bash
# Install globally
curl https://cli.sentry.dev/install -fsS | bash
# Or via npm
npm install -g sentry

# Authenticate
sentry auth login
```

### Key Commands
| Command | Description |
|---------|-------------|
| `sentry issue list` | List recent issues (auto-detects project) |
| `sentry issue explain <ID>` | AI-powered root cause analysis |
| `sentry issue plan <ID>` | Generate step-by-step fix plan |
| `sentry project list` | List projects in org |
| All commands support `--json` | For scripting/pipelines |

## Release Tracking

Tag releases so Sentry links errors to deploys:

```bash
# In CI after deploy
sentry releases new $VERSION
sentry releases set-commits $VERSION --auto
sentry releases finalize $VERSION
sentry releases deploys $VERSION new -e production
```

Or set `release` in SDK init:
```typescript
Sentry.init({
  dsn: "...",
  release: process.env.COMMIT_SHA || "dev",
  environment: process.env.NODE_ENV,
})
```

## Verification

After setup, trigger a test error:
```typescript
import * as Sentry from "@sentry/react" // or @sentry/nextjs
Sentry.captureException(new Error("Sentry test — delete me"))
```

Check [sentry.io/issues/](https://sentry.io/issues/) — error should appear within 30 seconds. If not:
1. Set `debug: true` in `Sentry.init()`
2. Check browser console / server logs for SDK errors
3. Verify DSN is correct and not empty
