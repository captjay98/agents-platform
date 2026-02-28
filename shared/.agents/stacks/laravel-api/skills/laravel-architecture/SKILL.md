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

Controllers should be thin — validate, delegate, respond:

```php
class PostController extends Controller
{
    public function store(StorePostRequest $request, CreatePost $action): PostResource
    {
        $post = $action->handle($request->validated(), $request->user());
        return (new PostResource($post))->response()->setStatusCode(201);
    }

    public function index(IndexPostRequest $request): PostCollection
    {
        $posts = Post::query()
            ->with(['user:id,name', 'tags'])
            ->withCount('comments')
            ->filter($request->validated())
            ->paginate($request->integer('per_page', 15));

        return new PostCollection($posts);
    }

    public function destroy(Post $post): Response
    {
        $this->authorize('delete', $post);
        $post->delete();
        return response()->noContent();
    }
}
```

## Action Pattern (HIGH)

One class, one operation. Keeps controllers thin and logic testable:

```php
// app/Actions/Posts/CreatePost.php
class CreatePost
{
    public function handle(array $data, User $author): Post
    {
        $post = $author->posts()->create([
            'title' => $data['title'],
            'content' => $data['content'],
            'slug' => Str::slug($data['title']),
            'status' => PostStatus::Draft,
        ]);

        if (!empty($data['tags'])) {
            $post->tags()->sync($data['tags']);
        }

        event(new PostCreated($post));

        return $post->load('tags');
    }
}
```

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
Route::prefix('v1')->middleware('api')->group(function () {
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
