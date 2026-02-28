---
name: testing-strategy
description: Comprehensive testing approach — unit tests, property tests, and integration tests. Use when planning test coverage or reviewing test quality.
---

# Testing Strategy

Layered testing approach: unit tests for logic, property tests for invariants, integration tests for data paths.

## Coverage Priorities (CRITICAL)

1. **Highest** — Financial calculations, auth/security boundaries
2. **High** — Business logic, data transformations, validation
3. **Medium** — CRUD operations, API endpoints
4. **Low** — Pure UI rendering, static content

## Test Pyramid (CRITICAL)

```
         /\
        /  \
       / E2E \        Few — critical user flows only
      /--------\
     /Integration\    Some — DB-backed repository tests
    /------------\
   /  Unit Tests  \   Many — pure functions, services, validators
  /----------------\
 / Property Tests   \ Targeted — financial invariants, calculations
/--------------------\
```

## Unit Tests (HIGH)

For pure functions, services, and validators:

```typescript
// Vitest / Jest
import { describe, it, expect } from 'vitest'
import { calculateDiscount, validateOrderData } from './service'

describe('calculateDiscount', () => {
  it('applies percentage discount correctly', () => {
    expect(calculateDiscount(100, 20)).toBe(80)
  })

  it('returns 0 for 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0)
  })

  it('throws for invalid percentage', () => {
    expect(() => calculateDiscount(100, 110)).toThrow()
  })
})

describe('validateOrderData', () => {
  it('returns null for valid data', () => {
    expect(validateOrderData({ quantity: 5, price: 10 })).toBeNull()
  })

  it('returns error for zero quantity', () => {
    expect(validateOrderData({ quantity: 0, price: 10 })).toBe('Quantity must be positive')
  })
})
```

## Property Tests (HIGH)

For invariants that must hold for all inputs:

```typescript
import fc from 'fast-check'

describe('financial invariants', () => {
  it('profit + cost always equals revenue', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000 }),
        fc.float({ min: 0, max: 1000000 }),
        (revenue, cost) => {
          const profit = revenue - cost
          expect(profit + cost).toBeCloseTo(revenue, 5)
        }
      )
    )
  })

  it('discount never makes price negative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100 }),
        (price, discountPercent) => {
          const discounted = calculateDiscount(price, discountPercent)
          expect(discounted).toBeGreaterThanOrEqual(0)
        }
      )
    )
  })
})
```

## Integration Tests (HIGH)

For repository functions and server functions with a real database:

```typescript
// Use a test database — never the production database
// DATABASE_URL_TEST=postgresql://...

describe('PostRepository', () => {
  let db: Kysely<Database>

  beforeAll(async () => {
    db = createTestDb()
    await runMigrations(db)
  })

  beforeEach(async () => {
    await truncateAllTables(db)  // Clean state between tests
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('inserts and retrieves a post', async () => {
    const user = await insertUser(db, { email: 'test@example.com', name: 'Test' })
    const post = await insertPost(db, { userId: user.id, title: 'Test', content: 'Content' })

    const retrieved = await getPostById(db, post.id)

    expect(retrieved).toBeDefined()
    expect(retrieved!.title).toBe('Test')
    expect(retrieved!.userId).toBe(user.id)
  })

  it('returns undefined for nonexistent post', async () => {
    const result = await getPostById(db, 'nonexistent-uuid')
    expect(result).toBeUndefined()
  })
})
```

## Server Function Tests (MEDIUM)

```typescript
describe('createPostFn', () => {
  it('throws UNAUTHORIZED without session', async () => {
    mockSession(null)
    await expect(createPostFn({ data: validPostData })).rejects.toThrow('UNAUTHORIZED')
  })

  it('throws VALIDATION_ERROR for invalid data', async () => {
    mockSession(testUser)
    await expect(createPostFn({ data: { title: '' } })).rejects.toThrow('VALIDATION_ERROR')
  })

  it('creates post and returns it', async () => {
    mockSession(testUser)
    const post = await createPostFn({ data: validPostData })
    expect(post.userId).toBe(testUser.id)
    expect(post.title).toBe(validPostData.title)
  })
})
```

## Done Criteria (MEDIUM)

A feature is production-ready when:
- [ ] Core business logic has unit test coverage
- [ ] Financial/calculation invariants have property tests
- [ ] Database write paths have integration tests
- [ ] Auth and validation failures are tested
- [ ] Happy path and at least 2 error paths are covered

## Anti-Patterns

- **Snapshot tests for unstable output** — brittle, breaks on any change
- **Skipping error path coverage** — most bugs are in error handling
- **Mocking the database in repository tests** — defeats the purpose
- **Only testing happy paths** — error paths are where bugs hide
- **Replacing property tests with a few static examples** — misses edge cases
