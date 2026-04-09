---
description: "Configure Sentry projects, releases, environments, and alert routing for Projavi."
---
@devops-engineer Set up Sentry for: $ARGUMENTS

Configure Sentry with Projavi production standards:
1. Enforce environment split (`development`, `staging`, `production`) with strict DSN separation.
2. Ensure release tagging is consistent across backend, frontend, and mobile artifacts.
3. Verify source maps/symbols upload paths so stack traces are actionable.
4. Define ownership and routing rules by domain: auth, catalog, pricing, sync, checkout, vendor operations.
5. Create alert policies that prioritize user-impact signals over noisy low-value errors.
6. Document escalation thresholds tied to deploy/rollback decisions.

Return:
- Final configuration map by service
- Ownership and alert-routing matrix
- Gaps or blockers with remediation steps
- Acceptance checklist proving setup is production-ready
