---
alwaysApply: true
---

# BullMQ Rules

1. **Always make jobs idempotent** — a job must produce the same result if run multiple times; use unique keys or check-before-act patterns.
2. **Always set retry limits** — never leave `attempts` unset; define a sensible limit (e.g. 3–5) with exponential backoff.
3. **Never do heavy computation inside job handlers** — jobs orchestrate work; delegate CPU-intensive tasks to worker threads or external services.
4. **Always handle job failure explicitly** — implement `failed` event handlers or use `onFailed` callbacks; never let failures go unobserved.
5. **Never pass large payloads in job data** — store large data in the database and pass only IDs in the job payload.
6. **Always use named queues per domain** — one queue per concern (e.g. `emails`, `notifications`, `exports`); never dump everything into a single queue.
