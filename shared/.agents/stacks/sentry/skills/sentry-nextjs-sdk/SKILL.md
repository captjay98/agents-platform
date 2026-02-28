---
name: sentry-nextjs-sdk
description: Full Sentry SDK setup for Next.js. Use when adding Sentry to Next.js apps — covers App Router, Pages Router, server actions, edge runtime, source maps, and all three runtimes (browser, Node.js, Edge).
---

# Sentry Next.js SDK

Adapted from the official `getsentry/sentry-agent-skills` repo (Apache-2.0). Always verify against [docs.sentry.io/platforms/javascript/guides/nextjs/](https://docs.sentry.io/platforms/javascript/guides/nextjs/).

## When to Use

- Adding Sentry to a Next.js 13+ app
- Configuring `@sentry/nextjs` across browser, server, and edge runtimes
- Setting up source maps, error boundaries, or session replay for Next.js

## Phase 1: Detect

```bash
cat package.json | grep -E '"next"|"@sentry/'
ls src/app app src/pages pages 2>/dev/null              # Router type
ls instrumentation.ts instrumentation-client.ts 2>/dev/null  # Existing config
ls next.config.ts next.config.js 2>/dev/null
```

| Detection | Impact |
|-----------|--------|
| App Router (`app/` dir) | Need `global-error.tsx` |
| Pages Router (`pages/` dir) | Need `_error.tsx` |
| Existing `@sentry/nextjs` | Skip install, configure features |
| Turbopack | Tree-shaking options are webpack-only |

## Phase 2: Setup

### Option A: Wizard (Recommended)

```bash
npx @sentry/wizard@latest -i nextjs
```

Creates all config files, wraps `next.config.ts`, configures source maps. Skip to Verification.

### Option B: Manual

```bash
npm install @sentry/nextjs --save
```

#### `instrumentation-client.ts` (Browser)
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
```

#### `sentry.server.config.ts` (Node.js)
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
})
```

#### `sentry.edge.config.ts` (Edge)
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
})
```

#### `instrumentation.ts` (Server registration)
```typescript
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config")
}

export const onRequestError = Sentry.captureRequestError
```

#### `app/global-error.tsx` (App Router)
```tsx
"use client"
import * as Sentry from "@sentry/nextjs"
import NextError from "next/error"
import { useEffect } from "react"

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return <html><body><NextError statusCode={0} /></body></html>
}
```

#### `next.config.ts`
```typescript
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

#### Exclude tunnel from middleware
```typescript
// middleware.ts
export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
}
```

## Runtime Dispatch

| `NEXT_RUNTIME` | Config loaded |
|---|---|
| `"nodejs"` | `sentry.server.config.ts` |
| `"edge"` | `sentry.edge.config.ts` |
| Client | `instrumentation-client.ts` |

## Environment Variables

| Variable | Runtime | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Browser SDK init (public) |
| `SENTRY_DSN` | Server/Edge | Server SDK init |
| `SENTRY_AUTH_TOKEN` | Build | Source map upload (secret) |
| `SENTRY_ORG` | Build | Org slug |
| `SENTRY_PROJECT` | Build | Project slug |

## Verification

```typescript
// Temporary — add to any server action or API route, then remove
throw new Error("Sentry test — delete me")
```

Check [sentry.io/issues/](https://sentry.io/issues/) within 30 seconds.

| Check | How |
|-------|-----|
| Client errors | Throw in client component |
| Server errors | Throw in server action / API route |
| Edge errors | Throw in middleware |
| Source maps | Stack trace shows readable file names |
| Replay | Check Replays tab |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `debug: true`, check DSN |
| Minified stack traces | Check `SENTRY_AUTH_TOKEN` is set in CI |
| `onRequestError` not firing | Upgrade to `@sentry/nextjs` >= 8.28.0 |
| Edge errors missing | Verify `instrumentation.ts` imports edge config |
| Tunnel 404 | Run `next build` after adding `tunnelRoute` |
| `global-error.tsx` not catching | Add `"use client"` as first line |
