---
globs:
  - "**/Http/Controllers/**/*.php"
alwaysApply: false
---

# Laravel Controller Rules

Controllers must be thin. They validate, authorize, delegate, and respond — nothing else.

1. **Never put business logic in controllers** — use Actions or Services
2. **Always use Form Requests** — never `$request->validate()` inline
3. **Always use `$request->validated()`** — never `$request->all()` or `$request->input()`
4. **Always use API Resources** — never return models or arrays directly
5. **Always authorize** — `$this->authorize()` or in Form Request's `authorize()`
6. **Return correct HTTP status codes** — 201 for create, 204 for delete, 200 for update

```php
// ✅ Correct pattern
public function store(StorePostRequest $request, CreatePost $action): JsonResponse
{
    $post = $action->handle($request->validated(), $request->user());
    return (new PostResource($post))->response()->setStatusCode(201);
}

// ❌ Wrong — business logic in controller
public function store(Request $request): JsonResponse
{
    $validated = $request->validate([...]);
    $post = Post::create($validated);
    $post->tags()->sync($validated['tags'] ?? []);
    event(new PostCreated($post));
    return response()->json($post, 201);
}
```
