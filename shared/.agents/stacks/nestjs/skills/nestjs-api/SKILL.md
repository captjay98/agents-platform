---
name: nestjs-api
description: Building REST APIs with NestJS — controllers, DTOs, validation pipes, serialization, and response patterns. Use when implementing API endpoints.
---

# NestJS API

Adapted from kadajett/agent-nestjs-skills.

## Global Setup (CRITICAL)

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,          // Auto-transform types
    transformOptions: { enableImplicitConversion: true },
  }))

  // Global serialization interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter())

  app.setGlobalPrefix('api/v1')
  await app.listen(3000)
}
```

## DTOs with Validation (CRITICAL)

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  name: string

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase())
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: 'user' | 'admin' = 'user'
}

// dto/user-response.dto.ts
import { Exclude, Expose } from 'class-transformer'

export class UserResponseDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  email: string

  @Expose()
  role: string

  @Expose()
  createdAt: Date

  @Exclude()
  password: string  // Never exposed

  @Exclude()
  internalNotes: string  // Never exposed

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial)
  }
}
```

## Controller (HIGH)

```typescript
// users.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
@SerializeOptions({ type: UserResponseDto })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto)
    return new UserResponseDto(user)
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.usersService.findAll({ page, limit, search })
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id)
    return new UserResponseDto(user)
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto, currentUser)
    return new UserResponseDto(user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id)
  }
}
```

## Pipes (HIGH)

```typescript
// ✅ Use built-in pipes for common transformations
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {}

@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('sort', new DefaultValuePipe('createdAt')) sort: string,
) {}

// Custom pipe for business-specific transformation
@Injectable()
export class ParseSortPipe implements PipeTransform {
  private readonly allowed = ['createdAt', 'name', 'email']

  transform(value: string): string {
    if (!this.allowed.includes(value)) {
      throw new BadRequestException(`Sort must be one of: ${this.allowed.join(', ')}`)
    }
    return value
  }
}
```

## Exception Filter (MEDIUM)

```typescript
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()

    response.status(status).json({
      statusCode: status,
      message: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message
        : exceptionResponse,
      timestamp: new Date().toISOString(),
    })
  }
}
```

## Interceptors (MEDIUM)

```typescript
// Wrap all responses in a consistent envelope
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    )
  }
}
```

## Rules

- Always use `whitelist: true` and `transform: true` on global ValidationPipe
- Always use response DTOs with `@Exclude()` — never return entities directly
- Always use built-in pipes (`ParseUUIDPipe`, `ParseIntPipe`) for route params
- Always return correct HTTP status codes — `@HttpCode(HttpStatus.CREATED)` for POST
- Never put validation logic in controllers — use DTOs and pipes
