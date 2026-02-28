<!-- PROJECT: This appears at the top of your generated AGENTS.md. Fill in the critical patterns
     that every agent must know before touching your codebase. Aim for 10-50 lines. Example: -->

## Critical Patterns

<!-- PROJECT: List 3-5 non-negotiable patterns. Example:

- **Dynamic imports for DB**: Always `const { getDb } = await import('~/lib/db')` in server functions. Static imports break the build.
- **No floating point money**: Use `multiply()`, `divide()`, `toDbString()` from `~/features/settings/currency`. Never raw arithmetic on currency.
- **Tenant isolation**: Every query must filter by `tenant_id`. No exceptions. Missing filter = data leak.
- **Offline-first**: All mutations go through the sync queue. Never write directly to the server from UI.
-->

## Architecture

<!-- PROJECT: One-paragraph summary of your architecture. Example:

Three-layer architecture: Server functions (auth + validation) → Services (business logic) → Repositories (database). No business logic in server functions. No database calls in services.
-->

## Domain Context

<!-- PROJECT: What does this app do, in one sentence? Who uses it? Example:

LivestockAI is a livestock farm management platform used by Nigerian poultry and fish farmers to track batches, feed, mortality, and financials — often on low-end Android devices with intermittent 3G connectivity.
-->
