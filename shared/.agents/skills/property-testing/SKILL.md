---
name: property-testing
description: Property-based testing with fast-check for business logic validation. Use when testing financial calculations, data transformations, or anything with hard-to-enumerate edge cases.
---

# Property Testing

Use fast-check to verify invariants hold for all inputs, not just hand-picked examples.

## When to Use (CRITICAL)

- Financial calculations (pricing, discounts, totals, commissions)
- Unit conversions
- Data transformations with invariants (serialize/deserialize roundtrips)
- State machines (valid transitions)
- Anything where edge cases are hard to enumerate

## Pattern (CRITICAL)

```typescript
import fc from 'fast-check'

describe('financial invariants', () => {
  it('total = subtotal + tax for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000_00 }),  // amount in minor units
        fc.integer({ min: 0, max: 25 }),           // tax percentage
        (subtotal, taxPercent) => {
          const tax = Math.round(subtotal * taxPercent / 100)
          const total = subtotal + tax
          return total >= subtotal && total === subtotal + tax
        },
      ),
    )
  })

  it('discount never exceeds original price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        (price, discountPercent) => {
          const discounted = price - Math.round(price * discountPercent / 100)
          return discounted >= 0 && discounted <= price
        },
      ),
    )
  })
})
```

## Rules

- Property tests complement example-based tests — don't replace them
- Keep generators realistic (valid domain ranges, not arbitrary)
- Use `fc.integer` for money — never `fc.float`
- Shrink failing cases to minimal reproduction before fixing
- Target invariants: "X must always be true" not "X equals Y for this input"
