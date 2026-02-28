---
name: laravel-eloquent
description: Eloquent ORM best practices — query optimization, relationships, scopes, and avoiding N+1 queries. Use when writing database queries or defining models.
---

# Laravel Eloquent

Adapted from iSerter/laravel-claude-agents.

## Query Optimization (CRITICAL)

### Eager Load Relationships

```php
// ❌ N+1 — fires 1 + N queries
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name;
}

// ✅ Eager load — 2 queries total
$posts = Post::with('user')->get();

// ✅ Nested eager loading
$posts = Post::with(['user:id,name', 'comments.user:id,name', 'tags'])->get();

// ✅ Conditional eager loading
$posts = Post::with(['comments' => fn($q) => $q->latest()->limit(3)])->get();
```

### Select Only Needed Columns

```php
// ❌ Fetches all columns
$users = User::all();

// ✅ Only needed columns
$users = User::select(['id', 'name', 'email'])->get();

// ✅ With relationships — must include FK
$posts = Post::with(['user:id,name'])->select(['id', 'title', 'user_id'])->get();
```

### Prevent Lazy Loading

```php
// AppServiceProvider::boot()
Model::preventLazyLoading(!app()->isProduction());
```

## Query Scopes (HIGH)

```php
class Post extends Model
{
    // Local scope
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', PostStatus::Published)
                     ->whereNotNull('published_at');
    }

    public function scopeByAuthor(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] ?? null, fn($q, $s) => $q->where('title', 'like', "%$s%"))
            ->when($filters['status'] ?? null, fn($q, $s) => $q->where('status', $s))
            ->when($filters['user_id'] ?? null, fn($q, $id) => $q->where('user_id', $id));
    }
}

// Usage
$posts = Post::published()->byAuthor($user)->filter($request->validated())->paginate(15);
```

## Relationships (HIGH)

```php
class Post extends Model
{
    // Always type-hint return types
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }

    // Counts without loading
    public function latestComment(): HasOne
    {
        return $this->hasOne(Comment::class)->latestOfMany();
    }
}

// withCount — no N+1
$posts = Post::withCount(['comments', 'likes'])->get();
echo $post->comments_count;
```

## Mass Assignment & Casts (HIGH)

```php
class Post extends Model
{
    protected $fillable = ['title', 'content', 'status', 'published_at'];

    protected $casts = [
        'published_at' => 'datetime',
        'metadata' => 'array',
        'is_featured' => 'boolean',
        'status' => PostStatus::class,  // PHP 8.1 enum cast
    ];

    protected $hidden = ['internal_notes'];
}
```

## Bulk Operations (MEDIUM)

```php
// ✅ Single query — no model events fired
Post::where('status', 'draft')->update(['status' => 'archived']);

// ✅ Increment without loading
Post::where('id', $id)->increment('views');

// ✅ Bulk insert
Post::insert($postsArray);  // No timestamps — use upsert for timestamps

// ✅ Upsert
Post::upsert($postsArray, ['slug'], ['title', 'content', 'updated_at']);

// ✅ Chunk large datasets
Post::chunk(500, function ($posts) {
    foreach ($posts as $post) { /* process */ }
});

// ✅ Lazy for memory efficiency
Post::lazy()->each(fn($post) => /* process */);
```

## Model Events (MEDIUM)

```php
class Post extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Post $post): void {
            $post->slug = Str::slug($post->title);
            $post->user_id ??= auth()->id();
        });

        static::deleting(function (Post $post): void {
            // Cascade soft-delete children
            $post->comments()->delete();
        });
    }
}
```

## Migrations (MEDIUM)

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->string('slug')->unique();
    $table->longText('content');
    $table->string('status')->default('draft')->index();
    $table->timestamp('published_at')->nullable()->index();
    $table->timestamps();
    $table->softDeletes();

    // Composite index for common queries
    $table->index(['status', 'published_at']);
    $table->index(['user_id', 'status']);
});
```

## Common Mistakes

- **Don't query in loops** — use `whereIn` or eager loading
- **Don't forget FK in select** — `select(['id', 'title'])` breaks `with('user')` (needs `user_id`)
- **Don't use `$guarded = []`** — always whitelist with `$fillable`
- **Don't skip indexes** — foreign keys and filter columns need indexes
