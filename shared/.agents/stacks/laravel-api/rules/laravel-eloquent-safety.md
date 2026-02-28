---
globs:
  - "**/Models/**/*.php"
alwaysApply: false
---

# Laravel Eloquent Rules

1. **Always eager load** — never access relationships in loops without `with()`
2. **Always select needed columns** — never `Model::all()` in production
3. **Always define relationship return types** — `public function user(): BelongsTo`
4. **Always use `$fillable`** — never `$guarded = []`
5. **Always add indexes** — foreign keys, filter columns, and sort columns need indexes
6. **Prevent lazy loading in development** — `Model::preventLazyLoading(!app()->isProduction())`

```php
// ✅ Correct
$posts = Post::with(['user:id,name', 'tags'])
    ->withCount('comments')
    ->select(['id', 'title', 'user_id', 'status', 'published_at'])
    ->published()
    ->paginate(15);

// ❌ Wrong — N+1, all columns, no type hints
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name;  // N+1
}
```
