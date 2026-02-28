---
name: observability-patterns
description: Correlation IDs, structured logging, and distributed tracing
---

# Observability Patterns

## 1. Correlation IDs

Every operation must have a traceable ID across the stack.

- Client generates `X-Request-ID` (UUID)
- Propagate through all service calls
- Include in error reports and logs

## 2. Structured Logging

Never log just the message. Log the context:
- Request ID, user/actor, operation name
- Domain-relevant metadata (truncated)
- Error code and stack trace

## 3. Sync Lifecycle Logging

For offline-capable apps, log the sync lifecycle:
1. `SYNC_START`: Device, item count
2. `SYNC_ITEM`: Action, result (success/conflict/fail)
3. `SYNC_END`: Success count, fail count

## 4. Client-Side Telemetry

Offline clients should buffer telemetry and flush when online.

<!-- PROJECT: Your specific logging setup, error tracking service, and key metrics -->

## Decision Guide

**Use when:**
- Adding a new feature that makes API calls or DB queries
- Debugging production issues
- Implementing offline sync
- Setting up error tracking

**Don't use when:**
- Purely static/presentational code
- Local development logging (use console.log)

**Decision tree:**
- New API endpoint? → Add correlation ID propagation
- Error handling? → Structured log with context, not just message
- Offline feature? → Add sync lifecycle logging
- Production debugging? → Check correlation ID trail first

**Failure modes:**
- No correlation ID → can't trace request across services
- Unstructured logs → can't search or alert on patterns
- No sync logging → can't diagnose offline conflicts
