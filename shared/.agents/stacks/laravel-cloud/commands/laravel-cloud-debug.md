---
description: "Debug backend incidents in Laravel Cloud using logs, metrics, and release context."
---
@devops-engineer Debug Laravel Cloud backend issue: $ARGUMENTS

Investigate using this sequence:
1. Establish incident window and correlate with recent deploys, migrations, and config changes.
2. Pull runtime errors from logs plus Sentry traces grouped by endpoint/job/signature.
3. Isolate likely fault domain: app code, queue/worker, cache, db query/migration, external integration.
4. Validate hypotheses with lowest-risk checks first.
5. Recommend mitigation path: rollback, hotfix, or config correction, with verification steps.

Return:
- Most likely root cause and confidence
- Evidence that supports or disproves each top hypothesis
- Immediate mitigation plan
- Durable fix plan with owner and verification criteria
