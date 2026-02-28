---
description: 'Debug offline/sync issues'
---

@frontend-engineer Debug offline issue: $ARGUMENTS

## Diagnostic Steps

1. **Service Worker**: Is it registered? Check `navigator.serviceWorker.controller`.
2. **Cache**: What's cached? Check Application > Cache Storage in DevTools.
3. **Sync queue**: Are mutations queued? Check IndexedDB/localStorage.
4. **Conflict resolution**: When back online, do queued mutations apply correctly?

<!-- PROJECT: Your specific offline architecture, sync mechanism, and debugging commands -->
