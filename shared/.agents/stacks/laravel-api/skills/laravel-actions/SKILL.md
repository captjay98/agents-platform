---
name: laravel-actions
description: Single-responsibility action classes for encapsulating business operations in Laravel. Use when implementing features to keep controllers thin.
---

# Laravel Actions

Single-responsibility classes that encapsulate one business operation. Keeps controllers thin and logic testable.

## Pattern (CRITICAL)

```
app/Actions/
├── Posts/
│   ├── CreatePost.php
│   ├── UpdatePost.php
│   ├── PublishPost.php
│   └── DeletePost.php
├── Users/
│   ├── RegisterUser.php
│   └── UpdateProfile.php
└── Orders/
    ├── PlaceOrder.php
    └── CancelOrder.php
```

Each action has a single `handle()` method. No inheritance, no interfaces required.

## Basic Action (CRITICAL)

```php
// app/Actions/Posts/CreatePost.php
class CreatePost
{
    public function handle(array $data, User $author): Post
    {
        $post = DB::transaction(function () use ($data, $author) {
            $post = $author->posts()->create([
                'title' => $data['title'],
                'content' => $data['content'],
                'slug' => $this->generateUniqueSlug($data['title']),
                'status' => PostStatus::Draft,
            ]);

            if (!empty($data['tags'])) {
                $post->tags()->sync($data['tags']);
            }

            return $post;
        });

        event(new PostCreated($post));

        return $post->load('tags');
    }

    private function generateUniqueSlug(string $title): string
    {
        $slug = Str::slug($title);
        $count = Post::where('slug', 'like', "$slug%")->count();
        return $count > 0 ? "$slug-$count" : $slug;
    }
}
```

## Action with Dependencies (HIGH)

```php
// app/Actions/Posts/PublishPost.php
class PublishPost
{
    public function __construct(
        private readonly SearchIndexer $indexer,
        private readonly NotificationService $notifications,
    ) {}

    public function handle(Post $post, User $publisher): Post
    {
        if (!$post->status->canTransitionTo(PostStatus::Published)) {
            throw new InvalidStateException("Post cannot be published from {$post->status->value} state.");
        }

        DB::transaction(function () use ($post, $publisher) {
            $post->update([
                'status' => PostStatus::Published,
                'published_at' => now(),
                'published_by' => $publisher->id,
            ]);

            $this->indexer->index($post);
        });

        // Outside transaction — non-critical
        $this->notifications->notifyFollowers($post);

        return $post->fresh(['user', 'tags']);
    }
}
```

## Controller Usage (HIGH)

```php
class PostController extends Controller
{
    public function store(StorePostRequest $request, CreatePost $action): JsonResponse
    {
        $post = $action->handle($request->validated(), $request->user());
        return (new PostResource($post))->response()->setStatusCode(201);
    }

    public function publish(Post $post, Request $request, PublishPost $action): PostResource
    {
        $this->authorize('publish', $post);
        $post = $action->handle($post, $request->user());
        return new PostResource($post);
    }
}
```

## Queueable Actions (MEDIUM)

When an action is slow, make it a job too:

```php
// app/Actions/Reports/GenerateReport.php
class GenerateReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly User $user,
        private readonly array $filters,
    ) {}

    public function handle(ReportBuilder $builder): void
    {
        $report = $builder->build($this->filters);
        $path = Storage::put("reports/{$this->user->id}", $report->toCsv());
        $this->user->notify(new ReportReady($path));
    }
}

// Dispatch as job
GenerateReport::dispatch($user, $filters);

// Or call synchronously
app(GenerateReport::class)->handle(app(ReportBuilder::class));
```

## Rules

- One action = one operation — never add a second `handle()` variant
- Actions receive validated data arrays and model instances — never raw requests
- Put DB transactions inside the action, not the controller
- Dispatch events inside the action after the transaction commits
- Inject dependencies via constructor — actions are resolved from the container
