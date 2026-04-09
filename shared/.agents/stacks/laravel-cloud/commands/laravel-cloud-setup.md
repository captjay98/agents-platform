---
description: "Prepare Laravel Cloud environments, secrets, and deploy prerequisites for Projavi backend."
---
@devops-engineer Set up Laravel Cloud backend environment for: $ARGUMENTS

Execute setup in this order:
1. Validate environment variables, secret rotation policy, and service credentials.
2. Verify queue, cache, and database connectivity with environment-specific isolation.
3. Confirm migration safety requirements (backward compatibility, rollback path, lock risk).
4. Ensure health endpoints, logging, and Sentry release markers are configured.
5. Define smoke checks for auth, catalog reads/writes, pricing conversion, and order/payment flows.

Return:
- Environment readiness checklist (pass/fail per item)
- Missing prerequisites and exact fixes
- Rollback prerequisites before first production deploy
