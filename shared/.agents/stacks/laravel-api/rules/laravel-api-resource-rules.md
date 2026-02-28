---
globs:
  - "**/Http/Resources/**/*.php"
alwaysApply: false
---

# Laravel API Resource Rules

1. **Always use `whenLoaded()`** — never `$this->user` directly in resources
2. **Always use `when()`** — never PHP ternaries for conditional fields
3. **Always format dates as ISO 8601** — `$this->created_at->toISOString()`
4. **Always include pagination metadata** in collection resources
5. **Create separate resources for list vs detail** — never one bloated resource

```php
// ✅ Correct
'author' => new UserResource($this->whenLoaded('user')),
'content' => $this->when($request->user()?->can('view', $this->resource), $this->content),
'created_at' => $this->created_at->toISOString(),

// ❌ Wrong — causes N+1, no conditional, wrong date format
'author' => new UserResource($this->user),
'content' => $request->user()?->can('view', $this->resource) ? $this->content : null,
'created_at' => $this->created_at,
```
