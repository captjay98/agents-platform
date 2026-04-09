---
name: offline-architecture
description: PWA offline-first patterns, sync strategies, and service worker debugging. Use when building offline-capable web applications.
core_ref: agents-platform
core_version: 2026-03-03
overlay_mode: append
---

# Offline Architecture

Use this skill when building or reviewing features that must work with unstable connectivity.

## Goal

Deliver full task completion in low-connectivity conditions with predictable sync and conflict behavior.

## When to Apply

- Mutations from field workflows (batch updates, feed logs, mortality entries, sales).
- Read-heavy dashboards used in poor network areas.
- Any UX that must remain usable during temporary outage.

## Core Model

- Local-first reads from IndexedDB cache.
- Mutation queue for offline writes.
- Background sync + retry with deterministic backoff.
- Explicit sync state in UI.

## Where This Lives in the application (Repo Pointers)

- Query client + offline-first defaults: `app/lib/query-client.ts`
- Offline indicator UI: `app/components/shared/pwa/offline-indicator.tsx`
- Sync status UI: `app/components/shared/pwa/sync-status.tsx`
- IndexedDB storage helpers: `idb-keyval` usage (see `app/lib/query-client.ts`)

## Required UX States

Every offline-capable flow must expose:

- `offline`: action accepted locally, queued for sync.
- `syncing`: mutation currently being replayed.
- `synced`: server acknowledgment received.
- `failed`: retryable error with user action.

## Conflict Policy

Define and document one policy per entity type:

- Last-write-wins for low-risk fields.
- Field-level merge for collaborative records.
- Manual resolution for financially sensitive records.

Do not ship without explicit policy.

## Queue Discipline

- Each queued mutation has idempotency key.
- Preserve creation order for dependent operations.
- Retry transient failures; stop on permanent validation errors.
- Persist retry metadata for diagnostics.

## Integration Pattern

- Keep server validation strict; offline does not mean schema bypass.
- Reuse the same server functions for replayed writes.
- Maintain runtime DB initialization pattern in server handlers:

```ts
const { getDb } = await import('~/lib/db')
const db = await getDb()
```

## Debugging Workflow

Use `/offline-debug` and verify:

- Pending queue length in IndexedDB.
- Failed mutations and last error payload.
- Service worker registration and active scope.
- Cache integrity and stale asset behavior.

## Anti-Patterns

- Hiding sync failures from users.
- Allowing non-idempotent replay of writes.
- Using optimistic UI without rollback strategy.
- Coupling UI availability to real-time network responses.

## Test Requirements

- Simulated offline mutation queue and replay.
- Replay ordering tests for dependent records.
- Conflict path test for each policy class.
- E2E test for offline-create then online-sync success.

## Review Checklist

- Feature usable while offline.
- Queue items are idempotent and durable.
- Sync state visible in UX.
- Conflict policy defined and tested.
- Offline failure path recoverable without data loss.

## Decision Guide

**Use this skill when:**

- Building any feature used in the field (feed logs, mortality entries, batch updates, sales)
- A feature must remain usable when the network drops mid-task
- Reviewing sync conflicts or "data not saving" reports from farmers
- Designing mutation flows that need optimistic UI

**Don't use this skill when:**

- The feature is admin-only and always used on desktop with reliable internet
- The feature is read-only analytics (offline reads are handled by TanStack Query cache automatically)

**Decision tree:**

- Is this a write operation from a field workflow? → Must use mutation queue + offline state
- Is this a read-heavy dashboard? → TanStack Query staleTime handles it; no extra work needed
- User reports "data disappeared after reconnect"? → Check sync conflict resolution in `app/lib/query-client.ts`
- User reports "app shows stale data"? → Check `staleTime` and `gcTime` config; check if queryKey includes all deps
- Need to show sync status? → Use `<SyncStatus />` component, don't build custom

**Failure modes:**

- Mutation queue not persisted to IndexedDB → queued actions lost on page refresh
- No conflict resolution strategy → last-write-wins silently overwrites data
- Sync state not shown in UI → farmer doesn't know if data was saved
- Service worker not caching API routes → offline reads fail even with TanStack Query cache
