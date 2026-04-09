---
name: multi-currency
description: Multi-currency money handling — integer minor units, currency codes, formatting, and FX rates. Use when implementing currency display, storage, or conversion.
---

# Multi-Currency

## Storage (CRITICAL)

Always store money as integer minor units + currency code:

```
amount_minor  BIGINT NOT NULL     -- e.g. 123456 = 1,234.56
currency_code CHAR(3) NOT NULL    -- ISO 4217: NGN, USD, EUR
exchange_rate DECIMAL(12,6) NULL  -- only if conversion applied
```

Never store floats or formatted strings.

## Formatting (HIGH)

Format at the edge (UI), never in the DB or API:

```typescript
export function formatMoney(amountMinor: number, currency: string, locale = 'en-NG') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency })
    .format(amountMinor / 100)
}

formatMoney(123456, 'NGN') // "₦1,234.56"
formatMoney(99900, 'USD', 'en-US') // "$999.00"
```

Flutter:
```dart
NumberFormat.simpleCurrency(name: currencyCode, locale: locale)
    .format(amountMinor / 100);
```

## Conversion (HIGH)

When converting between currencies:
- Store the FX rate used at transaction time — never recalculate later
- Apply rate to minor units, round to nearest integer
- Log the source rate and timestamp for audit

## Rules

- Money columns: `amount_minor` (bigint) + `currency_code` (char(3))
- Format only at UI layer — API returns raw minor units
- Default currency configured per tenant/app, not hardcoded
- FX rates stored at transaction time, never retroactively applied
