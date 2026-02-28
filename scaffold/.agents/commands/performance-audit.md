---
description: 'Comprehensive performance analysis — runbook with actual commands and GO/NO-GO gates'
---

@fullstack-engineer Run a performance audit: $ARGUMENTS

**Context**: <!-- PROJECT: Who uses this app? What devices/networks? Why does performance matter? -->

**Targets**:
| Metric | Target | Critical |
|--------|--------|----------|
| LCP | < 2.5s | > 4s = fail |
| INP | < 200ms | > 500ms = fail |
| CLS | < 0.1 | > 0.25 = fail |
| API Response (p95) | < 200ms | > 500ms = fail |
<!-- PROJECT: Add project-specific metrics -->

## Step 1: Bundle Analysis

```bash
# <!-- PROJECT: Your build command -->
# <!-- PROJECT: Command to inspect bundle size -->
```

**Expected**: Initial bundle < <!-- PROJECT: target -->. **If over**: Identify largest chunks and lazy-load candidates.

## Step 2: API Performance

```bash
# <!-- PROJECT: Command to profile slow queries or endpoints -->
```

**Look for**: N+1 queries, missing indexes, unoptimized joins.

## Step 3: Core Web Vitals

```bash
# <!-- PROJECT: Lighthouse or CWV measurement command -->
```

## GO/NO-GO

- All metrics within Target = **GO**
- Any metric in Critical = **NO-GO**, fix before release
- Metrics between Target and Critical = **GO with follow-up ticket**
