---
name: financial-patterns
description: Decimal precision, currency formatting, and financial math integrity. Use when implementing money calculations, currency display, or financial reporting.
core_ref: agents-platform
core_version: 2026-03-03
overlay_mode: append
---

# Financial Patterns

Use this skill for any feature that stores, transforms, displays, or reconciles money.

## When to Apply

- Price, cost, margin, profit, invoice, expense, payout, or balance logic.
- Currency conversion and multi-currency display.
- Any server function that writes financial records.
- Any UI that renders user-visible monetary values.

## Non-Negotiables

- Never use raw floating-point math for money.
- Never hardcode currency symbols in UI (`$`, `N`, `EUR`, etc.).
- Never mutate historical financial transactions in place.
- Always retain sign semantics (`expense < 0`, `income > 0`) consistently.

## Required Utilities

Use helpers in `app/lib/formatting/currency-core.ts`:

- `toDecimal(value)` for safe conversion.
- `multiply(a, b)` and `divide(a, b)` for deterministic math.
- `toDbString(value)` before persistence.
- `toNumber(value)` only for display/read-only scenarios.

Use UI formatting helpers:

- `useFormatCurrency().format(amount)` for user-facing output.
- `useFormatCurrency().formatCompact(amount)` for dense cards/charts.

## Server Patterns

Always use runtime DB initialization in server functions:

```ts
const { getDb } = await import('~/lib/db')
const db = await getDb()
```

Persist normalized strings:

```ts
import { multiply, toDbString } from '~/lib/financial'

const total = multiply(unitPrice, quantity)
await db
  .insertInto('expenses')
  .values({
    amount: toDbString(total),
    category: 'feed',
  })
  .execute()
```

## UI Patterns

```tsx
import { useFormatCurrency } from '~/hooks/settings'

function RevenueCard({ amount }: { amount: string }) {
  const { format } = useFormatCurrency()
  return <span>{format(amount)}</span>
}
```

## Reconciliation Rules

- Sum of ledger entries must equal computed aggregate totals.
- Split allocation must preserve total exactly.
- Round only at display boundaries unless domain requires persisted rounding.
- For percentage-derived values, define one canonical rounding point and keep it stable.

## Anti-Patterns

- `Number(a) * Number(b)` for persisted money.
- `parseFloat` for business-critical currency transformations.
- Multiple ad-hoc conversion helpers scattered across features.
- Silent fallback to zero on parse errors.

## Test Requirements

- Unit tests for deterministic arithmetic edge cases.
- Property tests for invariants:
  - `revenue - cost = profit`
  - split sums equal source total
  - conversions are stable across repeated transform cycles
- Integration tests for DB read/write shape and precision preservation.

## Review Checklist

- All money math uses currency utilities.
- All persisted currency values use `toDbString`.
- UI uses `useFormatCurrency`, no hardcoded symbols.
- No float-based arithmetic in business logic.
- Tests include at least one property test for invariant behavior.

## Decision Guide

**Use when:** Money calculations, storage, display, multi-currency
**Don't use when:** Non-financial numbers (quantities, weights, percentages)

**Decision tree:**

- Storing money? → `toDbString()` to TEXT/VARCHAR
- Reading money? → `toNumber()` to integer minor units
- Calculating? → `multiply()`, `divide()` — never `* 1.5`
- Displaying? → `useFormatCurrency()` — never hardcode symbols
- Converting currencies? → Store rate as integer, use utilities

**Failure modes:**

- `toFixed(2)` in calculations → floating point errors
- Hardcoded symbols → breaks multi-region
- DECIMAL/FLOAT in DB → precision loss
- `parseFloat()` → silent fallback to 0
