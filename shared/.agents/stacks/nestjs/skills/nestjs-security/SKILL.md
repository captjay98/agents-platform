---
name: nestjs-security
description: Security patterns for NestJS APIs — JWT authentication, guards, rate limiting, and input validation. Use when implementing auth and security.
---

# NestJS Security

Adapted from kadajett/agent-nestjs-skills.

## JWT Authentication (CRITICAL)

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

```typescript
// features/auth/auth.module.ts
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// features/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    })
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Minimal payload — only non-sensitive data
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

```typescript
// features/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user || !await bcrypt.compare(dto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: new UserResponseDto(user),
    }
  }
}
```

## Guards (HIGH)

```typescript
// common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message ?? 'Unauthorized')
    }
    return user
  }
}

// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) return true

    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.includes(user.role)
  }
}

// Decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

// Usage
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async adminOnly() {}
```

## Rate Limiting (HIGH)

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },   // 10 req/sec
      { name: 'medium', ttl: 60000, limit: 100 }, // 100 req/min
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

// Stricter limits for auth endpoints
@Controller('auth')
@Throttle({ short: { ttl: 60000, limit: 5 } })  // 5 req/min for auth
export class AuthController {}

// Skip throttling for specific routes
@Get('health')
@SkipThrottle()
healthCheck() {}
```

## Input Validation (HIGH)

```typescript
// Always use class-validator on all DTOs
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string
}

// Global pipe with whitelist — strips unknown properties
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
```

## Helmet and CORS (MEDIUM)

```bash
npm install helmet
```

```typescript
// main.ts
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
}
```

## Rules

- Never hardcode JWT secrets — always use `ConfigService`
- Always set short access token expiry (15m) with refresh tokens (7d)
- Never store sensitive data in JWT payload — only `sub`, `email`, `role`
- Always use `whitelist: true` on ValidationPipe — strips unknown properties
- Apply `ThrottlerGuard` globally, then override per-controller for auth endpoints
