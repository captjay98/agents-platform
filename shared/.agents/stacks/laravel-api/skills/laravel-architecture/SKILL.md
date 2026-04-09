---
name: laravel-architecture
description: Application structure, service layer patterns, and code organization for Laravel API projects. Use when starting a new feature or refactoring existing code.
---

# Laravel Architecture

## Directory Structure

```
app/
├── Http/
│   ├── Controllers/     # Thin — delegate to actions/services
│   ├── Requests/        # Form request validation
│   ├── Resources/       # API response transformation
│   └── Middleware/
├── Actions/             # Single-responsibility business operations
├── Models/              # Eloquent models + relationships
├── Services/            # Complex multi-step business logic
├── Repositories/        # Optional: abstract data access
├── Enums/               # PHP 8.1+ backed enums
├── Events/ + Listeners/
├── Jobs/                # Queued work
└── Exceptions/
```

## Controller Pattern (CRITICAL)

See laravel-api-conventions for the Controller → Service → Model pattern.

## Action Pattern (HIGH)

See laravel-actions for the single-responsibility action pattern.

## Service Pattern (HIGH)

For complex multi-step operations spanning multiple models:

```php
// app/Services/PublishingService.php
class PublishingService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly SearchIndexer $indexer,
    ) {}

    public function publish(Post $post): Post
    {
        DB::transaction(function () use ($post) {
            $post->update([
                'status' => PostStatus::Published,
                'published_at' => now(),
            ]);

            $this->indexer->index($post);
            $this->notifications->notifyFollowers($post);
        });

        return $post->fresh();
    }
}
```

## Route Organization (HIGH)

```php
// routes/api.php
Route::prefix('api')->middleware('api')->group(function () {
    // Public
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);

    // Authenticated
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('posts', PostController::class);
        Route::apiResource('posts.comments', CommentController::class)->shallow();
        Route::post('/posts/{post}/publish', [PostController::class, 'publish']);
    });
});
```

## Enums (MEDIUM)

```php
enum PostStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match($this) {
            self::Draft => 'Draft',
            self::Published => 'Published',
            self::Archived => 'Archived',
        };
    }

    public function canTransitionTo(self $status): bool
    {
        return match($this) {
            self::Draft => $status === self::Published,
            self::Published => $status === self::Archived,
            self::Archived => false,
        };
    }
}

// In model
protected $casts = ['status' => PostStatus::class];
```

## Rules

- Controllers only: validate, authorize, delegate, respond
- Actions for single operations; Services for multi-step workflows
- Never put business logic in models (use actions/services)
- Always use Form Requests for validation
- Always use API Resources for responses
- Use `DB::transaction()` for multi-model writes
