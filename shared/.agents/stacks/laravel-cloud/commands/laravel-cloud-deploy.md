---
description: "Run a production-safe Laravel Cloud backend deployment workflow."
---
@devops-engineer Deploy backend on Laravel Cloud for: $ARGUMENTS

Run a controlled deployment protocol:
1. Preflight: pending migrations, config diff, secrets drift, queue health, and dependency changes.
2. Deploy: annotate release version, execute deployment, and watch startup/runtime signals.
3. Migration safety: apply in correct order, verify long-running/locking risk, and validate data integrity.
4. Post-deploy smoke: auth, product search/catalog fetch, price conversion endpoint, order workflow, webhook handling.
5. Release-health gate: compare baseline error/latency signals and decide hold, proceed, or rollback.

Return:
- Deployment timeline and release id
- Preflight checklist with evidence
- Smoke-test results
- Rollback trigger criteria and current decision
