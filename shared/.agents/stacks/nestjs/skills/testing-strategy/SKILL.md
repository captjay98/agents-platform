---
name: testing-strategy
description: NestJS testing approach — unit tests with Jest, integration tests with @nestjs/testing, e2e tests with supertest. Use when planning test coverage or writing tests.
---

# Testing Strategy (NestJS)

Layered testing: unit tests for services, integration tests for modules, e2e tests for HTTP endpoints.

## Coverage Priorities (CRITICAL)

1. **Highest** — Financial calculations, auth guards, payment webhooks
2. **High** — Business logic services, validation pipes
3. **Medium** — CRUD operations, controllers
4. **Low** — DTOs, pure utility functions

## Unit Tests (CRITICAL)

Test services in isolation with mocked dependencies:

```typescript
import { Test } from '@nestjs/testing'
import { OrderService } from './order.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Order } from './order.entity'

describe('OrderService', () => {
  let service: OrderService
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockRepo },
      ],
    }).compile()
    service = module.get(OrderService)
  })

  it('creates an order', async () => {
    const data = { userId: 'u1', productId: 'p1', quantity: 2 }
    mockRepo.create.mockReturnValue({ ...data, id: 'o1' })
    mockRepo.save.mockResolvedValue({ ...data, id: 'o1', status: 'pending' })

    const result = await service.create(data)
    expect(result.status).toBe('pending')
    expect(mockRepo.save).toHaveBeenCalledTimes(1)
  })

  it('throws on order not found', async () => {
    mockRepo.findOne.mockResolvedValue(null)
    await expect(service.findById('missing')).rejects.toThrow('Not found')
  })
})
```

## Integration Tests (HIGH)

Test modules with real dependencies wired together:

```typescript
import { Test } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderModule } from './order.module'
import { OrderService } from './order.service'
import { DataSource } from 'typeorm'

describe('OrderModule (integration)', () => {
  let service: OrderService
  let dataSource: DataSource

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.TEST_DATABASE_URL,
          autoLoadEntities: true,
          synchronize: true,
        }),
        OrderModule,
      ],
    }).compile()

    service = module.get(OrderService)
    dataSource = module.get(DataSource)
  })

  afterAll(() => dataSource.destroy())

  it('persists and retrieves an order', async () => {
    const order = await service.create({ userId: 'u1', productId: 'p1', quantity: 1 })
    const found = await service.findById(order.id)
    expect(found.id).toBe(order.id)
  })
})
```

## E2E Tests (HIGH)

Test HTTP endpoints with supertest:

```typescript
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Orders (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = module.createNestApplication()
    await app.init()
  })

  afterAll(() => app.close())

  it('POST /orders → 201', () =>
    request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'p1', quantity: 2 })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined()
        expect(res.body.status).toBe('pending')
      }))

  it('GET /orders/:id → 404 for missing', () =>
    request(app.getHttpServer())
      .get('/orders/nonexistent')
      .expect(404))
})
```

## Testing Guards & Pipes (MEDIUM)

```typescript
describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector())
  const mockContext = (roles: string[], userRole: string) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: userRole } }),
    }),
  })

  it('allows admin access', () => {
    Reflect.defineMetadata('roles', ['admin'], mockContext(['admin'], 'admin').getHandler())
    expect(guard.canActivate(mockContext(['admin'], 'admin') as any)).toBe(true)
  })
})
```

## Anti-Patterns

```typescript
// ❌ Testing implementation details
expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'o1' } })

// ✅ Test behavior/output
const result = await service.findById('o1')
expect(result.status).toBe('pending')

// ❌ No cleanup — tests leak state
beforeEach(async () => { await repo.save(testData) })

// ✅ Clean up after each test
afterEach(async () => { await repo.clear() })

// ❌ Testing private methods directly
expect(service['calculateTotal'](items)).toBe(100)

// ✅ Test through public API
const order = await service.create({ items })
expect(order.total).toBe(100)
```

## Rules

- Unit tests mock all dependencies via `Test.createTestingModule`
- Integration tests use a real test database, clean up with `afterEach`/`afterAll`
- E2E tests use `supertest` against `app.getHttpServer()`
- Test behavior, not implementation — assert outputs, not mock call args
- Financial and auth tests are highest priority
- Use `jest.fn()` for mocks, not manual stubs
