---
name: nestjs-architecture
description: Feature module organization, dependency injection, repository pattern, and application structure for NestJS APIs. Use when structuring a NestJS application.
---

# NestJS Architecture

Adapted from kadajett/agent-nestjs-skills.

## Feature Module Structure (CRITICAL)

Organize by feature, not by technical layer:

```
src/
├── app.module.ts
├── main.ts
├── config/
│   └── configuration.ts
├── common/
│   ├── filters/          # Exception filters
│   ├── guards/           # Auth guards
│   ├── interceptors/     # Response interceptors
│   └── pipes/            # Validation pipes
└── features/
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   ├── users.repository.ts
    │   ├── entities/
    │   │   └── user.entity.ts
    │   └── dto/
    │       ├── create-user.dto.ts
    │       ├── update-user.dto.ts
    │       └── user-response.dto.ts
    └── posts/
        ├── posts.module.ts
        └── ...
```

## Feature Module (CRITICAL)

```typescript
// features/users/users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],  // Export only what other modules need
})
export class UsersModule {}
```

## Dependency Injection (CRITICAL)

```typescript
// ✅ Constructor injection (preferred)
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}

// ❌ Service locator (anti-pattern)
@Injectable()
export class UsersService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async doSomething() {
    const repo = this.moduleRef.get(UsersRepository)  // Don't do this
  }
}
```

## Repository Pattern (HIGH)

```typescript
// features/users/users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findActiveWithPosts(minPosts: number): Promise<User[]> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.posts', 'post')
      .where('user.isActive = :active', { active: true })
      .groupBy('user.id')
      .having('COUNT(post.id) >= :min', { min: minPosts })
      .getMany()
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data)
    return this.repo.save(user)
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data)
    return this.findById(id) as Promise<User>
  }
}
```

## Service Layer (HIGH)

```typescript
// features/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Email already in use')
    }

    const user = await this.usersRepository.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 12),
    })

    this.eventEmitter.emit('user.created', user)
    return user
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException(`User ${id} not found`)
    return user
  }
}
```

## Configuration (HIGH)

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
})

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        database: config.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,  // Never true in production
      }),
    }),
  ],
})
export class AppModule {}
```

## Rules

- Feature modules only — never organize by technical layer
- Always use constructor injection — never service locator
- Always use custom repositories for complex queries — keep services focused on business logic
- Never use `synchronize: true` in production — always use migrations
- Export only what other modules need from each module
