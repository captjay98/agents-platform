---
name: nestjs-testing
description: Testing NestJS applications — unit tests with TestingModule, e2e tests with Supertest, and mocking patterns. Use when writing tests for NestJS.
---

# NestJS Testing

Adapted from kadajett/agent-nestjs-skills.

## Unit Tests with TestingModule (CRITICAL)

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'

describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<UsersRepository>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    repository = module.get(UsersRepository)
  })

  describe('create', () => {
    it('creates a user with hashed password', async () => {
      const dto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
      }
      const mockUser = { id: 'uuid-1', ...dto, password: 'hashed' }

      repository.findByEmail.mockResolvedValue(null)
      repository.create.mockResolvedValue(mockUser as User)

      const result = await service.create(dto)

      expect(result.id).toBe('uuid-1')
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email })
      )
      // Verify password was hashed
      expect(repository.create.mock.calls[0][0].password).not.toBe(dto.password)
    })

    it('throws ConflictException if email already exists', async () => {
      repository.findByEmail.mockResolvedValue({ id: 'existing' } as User)

      await expect(service.create({
        name: 'Jane',
        email: 'existing@example.com',
        password: 'Password123',
      })).rejects.toThrow(ConflictException)
    })
  })

  describe('findById', () => {
    it('throws NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null)
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})
```

## Controller Tests (HIGH)

```typescript
// users.controller.spec.ts
describe('UsersController', () => {
  let controller: UsersController
  let service: jest.Mocked<UsersService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })  // Skip auth in unit tests
    .compile()

    controller = module.get<UsersController>(UsersController)
    service = module.get(UsersService)
  })

  it('creates a user and returns 201', async () => {
    const dto: CreateUserDto = { name: 'John', email: 'john@example.com', password: 'Pass123' }
    const mockUser = { id: 'uuid-1', ...dto }
    service.create.mockResolvedValue(mockUser as User)

    const result = await controller.create(dto)

    expect(service.create).toHaveBeenCalledWith(dto)
    expect(result).toBeInstanceOf(UserResponseDto)
  })
})
```

## E2E Tests with Supertest (HIGH)

```typescript
// test/users.e2e-spec.ts
import * as request from 'supertest'

describe('Users (e2e)', () => {
  let app: INestApplication
  let authToken: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })

    authToken = loginResponse.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/v1/users', () => {
    it('creates a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New User', email: 'new@example.com', password: 'Password123' })
        .expect(201)

      expect(response.body.data.email).toBe('new@example.com')
      expect(response.body.data.password).toBeUndefined()  // Excluded
    })

    it('returns 422 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'not-an-email' })
        .expect(422)
    })

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ name: 'Test', email: 'test@example.com', password: 'Pass123' })
        .expect(401)
    })
  })
})
```

## Mocking External Services (MEDIUM)

```typescript
// Mock email service
const mockEmailService = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}

// Mock TypeORM repository
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  })),
}

// In TestingModule
{
  provide: getRepositoryToken(User),
  useValue: mockRepository,
}
```

## Rules

- Always use `TestingModule` — never instantiate services manually
- Always mock external dependencies (email, payment, external APIs)
- Always override guards in unit tests — test business logic, not auth
- Test both happy path and error cases (not found, conflict, unauthorized)
- Use e2e tests for integration — test the full HTTP stack including validation
