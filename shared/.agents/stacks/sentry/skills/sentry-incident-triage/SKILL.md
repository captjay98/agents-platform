---
name: sentry-incident-triage
description: Incident triage methodology, release health monitoring, and rollback triggers via Sentry. Use when triaging production incidents or validating releases.
---

# Sentry Incident Triage

## Triage Workflow (CRITICAL)

1. Scope impact: affected endpoints/routes/platforms and user-facing severity
2. Cluster issues by fingerprint and transaction; isolate top regressions
3. Correlate traces with deploys, migrations, queue jobs, and external integrations
4. Build root-cause hypotheses and validate highest-confidence first
5. Recommend immediate mitigation (rollback, toggle, hotfix)

## Release Health (HIGH)

1. Enforce consistent release and environment tagging across all services
2. Verify stack symbol/source-map quality so traces are readable
3. Validate issue ownership rules by domain area
4. Define alert thresholds tied to user-impact outcomes, not raw exception counts
5. Compare pre-release baseline vs post-release trend: pass/hold/rollback

## Rollback Triggers (CRITICAL)

- Crash-free session drop ≥ 1.0 percentage point
- New S1 issue count ≥ 2 within 30 minutes
- Transaction p95 regression ≥ 30% on critical routes

## Rules

- Do not infer root cause from single-event samples
- Separate symptom, trigger, and root cause explicitly
- Avoid paging policies that trigger on low-value noise
