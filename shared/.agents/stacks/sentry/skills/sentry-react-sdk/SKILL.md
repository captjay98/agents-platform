---
name: sentry-react-sdk
description: Full Sentry SDK setup for React. Use when adding Sentry to React apps — covers error monitoring, tracing, session replay, profiling, and logging. Supports React 16+, React Router v5-v7, TanStack Router, Redux, Vite, and webpack.
---

# Sentry React SDK

Adapted from the official `getsentry/sentry-agent-skills` repo (Apache-2.0). Always verify against [docs.sentry.io/platforms/javascript/guides/react/](https://docs.sentry.io/platforms/javascript/guides/react/).

## When to Use

- Adding Sentry to a React app (not Next.js — use `sentry-nextjs-sdk` for that)
- Configuring `@sentry/react` for error monitoring, tracing, replay, or profiling
- Setting up React Router or TanStack Router integration

## Phase 1: Detect

```bash
cat package.json | grep -E '"react"|"react-dom"'       # React version
cat package.json | grep '"@sentry/'                     # Existing Sentry
cat package.json | grep -E '"react-router-dom"|"@tanstack/react-router"'  # Router
cat package.json | grep -E '"redux"|"@reduxjs/toolkit"' # State management
ls vite.config.ts webpack.config.js 2>/dev/null         # Build tool
```

| Detection | Impact |
|-----------|--------|
| React 19+ | Use `reactErrorHandler()` on `createRoot` |
| React <19 | Use `Sentry.ErrorBoundary` |
| TanStack Router | Use `tanstackRouterBrowserTracingIntegration(router)` |
| React Router v6/v7 | Use matching `reactRouterV6/V7BrowserTracingIntegration` |
| Redux | Add `Sentry.createReduxEnhancer()` |
| Vite | Source maps via `sentryVitePlugin` |

## Phase 2: Install & Configure

```bash
npm install @sentry/react --save
```

### Create `src/instrument.ts`

Must be imported **before any other code** in your entry file:

```typescript
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  sendDefaultPii: true,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  tracesSampleRate: 1.0,  // lower to 0.1-0.2 in production
  tracePropagationTargets: ["localhost", /^https:\/\/yourapi\.io/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
})
```

### Entry Point

```tsx
// src/main.tsx — instrument MUST be first import
import "./instrument"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
)
```

### Error Handling by React Version

**React 19+:**
```tsx
import { reactErrorHandler } from "@sentry/react"

createRoot(document.getElementById("root")!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(<App />)
```

**React <19:**
```tsx
import * as Sentry from "@sentry/react"

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong</p>} showDialog>
    <App />
  </Sentry.ErrorBoundary>
)
```

### Router Integration

| Router | Integration |
|--------|------------|
| TanStack Router | `tanstackRouterBrowserTracingIntegration(router)` |
| React Router v7 | `reactRouterV7BrowserTracingIntegration` |
| React Router v6 | `reactRouterV6BrowserTracingIntegration` |
| React Router v5 | `reactRouterV5BrowserTracingIntegration` |
| None | `browserTracingIntegration()` (default) |

**TanStack Router:**
```typescript
import { tanstackRouterBrowserTracingIntegration } from "@sentry/react"
Sentry.init({
  integrations: [tanstackRouterBrowserTracingIntegration(router)],
})
```

**React Router v6/v7:**
```typescript
import { reactRouterV6BrowserTracingIntegration } from "@sentry/react"
import { useEffect } from "react"
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from "react-router-dom"

Sentry.init({
  integrations: [
    reactRouterV6BrowserTracingIntegration({
      useEffect, useLocation, useNavigationType, matchRoutes, createRoutesFromChildren,
    }),
  ],
})
```

### Redux Integration

```typescript
import * as Sentry from "@sentry/react"
import { configureStore } from "@reduxjs/toolkit"

const store = configureStore({
  reducer: rootReducer,
  enhancers: (defaults) => defaults().concat(Sentry.createReduxEnhancer()),
})
```

## Key Init Options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `dsn` | string | — | Required |
| `tracesSampleRate` | number | — | 0-1; 1.0 dev, 0.1-0.2 prod |
| `replaysSessionSampleRate` | number | — | Fraction of all sessions recorded |
| `replaysOnErrorSampleRate` | number | — | Fraction of error sessions recorded |
| `tracePropagationTargets` | array | — | URLs that receive distributed tracing headers |
| `sendDefaultPii` | boolean | false | Include IP, request headers |
| `enableLogs` | boolean | false | Enable `Sentry.logger.*` API |
| `tunnel` | string | — | Proxy URL to bypass ad blockers |
| `debug` | boolean | false | Verbose SDK output to console |

## Verification

```tsx
<button onClick={() => { throw new Error("Sentry test") }}>Test Error</button>
<button onClick={() => Sentry.captureMessage("Test message", "info")}>Test Message</button>
```

Check: Issues → error appears. Traces → page load visible. Replays → session recorded.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `debug: true`, check DSN |
| Minified stack traces | Source maps not uploading — check build plugin |
| `instrument.ts` not first | Must be first import in entry file |
| Router transactions `<unknown>` | Add matching router integration |
| Ad blockers dropping events | Set `tunnel` option |
