---
name: quality-gates
description: Release readiness checks and quality gates. Use when preparing changes for release, signoff, or production validation.
---

# Quality Gates

## Hard Gates (block release)

- All tests pass (backend + frontend + mobile)
- No critical/high Sentry issues in staging
- Migrations are reversible
- Type checks pass across all consumers
- No secrets or PII in committed code

## Soft Gates (flag, don't block)

- Coverage meets targets
- No new TODOs without tickets
- Documentation current
- Performance benchmarks within tolerance
- Bundle size within budget

## Money-Critical Gates

- Financial calculation tests pass with property testing
- Integer minor-unit invariants verified
- No floating-point in money paths
- Idempotency verified on payment/webhook handlers

## Rules

- Hard gates are automated — CI blocks merge on failure
- Soft gates are reviewed — human decides if acceptable
- Money-critical gates are mandatory for any PR touching financial flows
