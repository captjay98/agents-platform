---
name: laravel-api-resources
description: Transforming Eloquent models into consistent JSON API responses using Laravel API Resources. Use when building API endpoints.
---

# Laravel API Resources

Adapted from iSerter/laravel-claude-agents.

## Basic Resource (CRITICAL)

```php
// app/Http/Resources/PostResource.php
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'status' => $this->status,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),

            // Only include if relationship was loaded
            'author' => new UserResource($this->whenLoaded('user')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'comments_count' => $this->when($this->comments_count !== null, $this->comments_count),

            // Conditional on permission
            'content' => $this->when(
                $request->user()?->can('view-full', $this->resource),
                $this->content
            ),

            // Admin-only fields
            $this->mergeWhen($request->user()?->isAdmin(), [
                'internal_notes' => $this->internal_notes,
            ]),

            'links' => [
                'self' => route('posts.show', $this->id),
            ],
        ];
    }
}
```

## Resource Collection with Pagination (CRITICAL)

```php
// app/Http/Resources/PostCollection.php
class PostCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'total' => $this->total(),
                'per_page' => $this->perPage(),
                'current_page' => $this->currentPage(),
                'last_page' => $this->lastPage(),
            ],
            'links' => [
                'first' => $this->url(1),
                'last' => $this->url($this->lastPage()),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
        ];
    }
}
```

## Controller Usage (HIGH)

```php
class PostController extends Controller
{
    public function index(IndexPostRequest $request): PostCollection
    {
        $posts = Post::with(['user:id,name', 'tags'])
            ->withCount('comments')
            ->filter($request->validated())
            ->paginate($request->integer('per_page', 15));

        return new PostCollection($posts);
    }

    public function show(Post $post): PostResource
    {
        $post->load(['user', 'comments.user', 'tags']);
        return new PostResource($post);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = Post::create($request->validated());

        return (new PostResource($post))
            ->response()
            ->setStatusCode(201)
            ->header('Location', route('posts.show', $post));
    }
}
```

## Context-Specific Resources (HIGH)

Create separate resources for different contexts rather than one bloated resource:

```php
// List view — minimal fields
class PostListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'status' => $this->status,
            'author' => $this->user?->name,
            'comments_count' => $this->comments_count ?? 0,
            'published_at' => $this->published_at?->toISOString(),
        ];
    }
}

// Detail view — full fields
class PostDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // All list fields plus...
            'content' => $this->content,
            'author' => new UserResource($this->whenLoaded('user')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
        ];
    }
}
```

## Additional Metadata (MEDIUM)

```php
class PostResource extends JsonResource
{
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'api_version' => '1.0',
                'generated_at' => now()->toISOString(),
            ],
        ];
    }

    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->header('X-Resource-Type', 'Post');
    }
}
```

## Rules

- Always use `whenLoaded()` for relationships — never `$this->user` directly
- Always use `when()` for conditional fields — never PHP ternaries
- Create separate resources for list vs detail contexts
- Always include pagination metadata in collections
- Use `toISOString()` for dates — never raw timestamps
- Disable wrapping globally if your frontend doesn't expect it: `JsonResource::withoutWrapping()`
