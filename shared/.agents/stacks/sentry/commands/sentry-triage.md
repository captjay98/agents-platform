---
description: "Triage and route Sentry issues by severity, ownership, and release impact."
---
@devops-engineer Triage Sentry incident stream for: $ARGUMENTS

Run this triage protocol:
1. Confirm scope: environment, release, timeframe, affected platforms (web/mobile/backend).
2. Cluster issues by fingerprint and transaction, then identify top-volume regressions.
3. Classify severity:
   - S1: payment, auth, checkout, or order-critical flow blocked
   - S2: major degradation with workaround
   - S3: non-blocking defect or noisy signal
4. Estimate blast radius by route, tenant/location, and user segment if available.
5. Propose immediate mitigation (rollback, config toggle, rate-limit, hotfix) and a durable fix path.
6. Assign owner routing across @backend-engineer, @frontend-engineer, @mobile-engineer, or @fullstack-engineer.

Return exactly:
- Severity and reason
- Affected release/environment
- Blast radius estimate
- Immediate mitigation (next 30-60 minutes)
- Durable fix owner and target verification
- Residual risk if mitigation is partial
