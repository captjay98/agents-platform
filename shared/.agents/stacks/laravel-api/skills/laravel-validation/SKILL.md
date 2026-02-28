---
name: laravel-validation
description: Form Request validation, custom rules, and validation patterns for Laravel APIs. Use when handling user input.
---

# Laravel Validation

## Form Requests (CRITICAL)

Always use Form Requests — never validate in controllers:

```php
// app/Http/Requests/StorePostRequest.php
class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Post::class);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'content' => ['required', 'string', 'min:10'],
            'status' => ['required', Rule::enum(PostStatus::class)],
            'published_at' => ['nullable', 'date', 'after:now'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['integer', Rule::exists('tags', 'id')],
            'category_id' => ['required', Rule::exists('categories', 'id')],
        ];
    }

    public function messages(): array
    {
        return [
            'title.min' => 'Title must be at least 3 characters.',
            'tags.max' => 'You can add at most 10 tags.',
        ];
    }

    // Transform input before validation
    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim($this->title),
        ]);
    }
}
```

## Update Requests (HIGH)

```php
class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('post'));
    }

    public function rules(): array
    {
        $post = $this->route('post');

        return [
            'title' => ['sometimes', 'string', 'min:3', 'max:255'],
            // Unique but ignore current record
            'slug' => ['sometimes', 'string', Rule::unique('posts')->ignore($post->id)],
            'status' => ['sometimes', Rule::enum(PostStatus::class)],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['integer', Rule::exists('tags', 'id')],
        ];
    }
}
```

## Custom Rules (HIGH)

```php
// app/Rules/ValidSlug.php
class ValidSlug implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value)) {
            $fail("The :attribute must be a valid slug (lowercase letters, numbers, hyphens).");
        }
    }
}

// app/Rules/NotReservedWord.php
class NotReservedWord implements ValidationRule
{
    private const RESERVED = ['admin', 'api', 'auth', 'login', 'register'];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (in_array(strtolower($value), self::RESERVED)) {
            $fail("The :attribute cannot be a reserved word.");
        }
    }
}

// Usage in rules()
'slug' => ['required', 'string', new ValidSlug, new NotReservedWord],
```

## Conditional Validation (MEDIUM)

```php
public function rules(): array
{
    return [
        'type' => ['required', Rule::in(['article', 'video'])],

        // Required only when type is video
        'video_url' => ['required_if:type,video', 'nullable', 'url'],
        'duration' => ['required_if:type,video', 'nullable', 'integer', 'min:1'],

        // Required unless another field is present
        'email' => ['required_unless:phone,null', 'email'],

        // Prohibited when another field has a value
        'draft_reason' => ['prohibited_unless:status,draft'],
    ];
}
```

## API Error Responses (MEDIUM)

Laravel automatically returns 422 JSON for API requests. Customize in `bootstrap/app.php`:

```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (ValidationException $e, Request $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }
    });

    $exceptions->render(function (ModelNotFoundException $e, Request $request) {
        if ($request->expectsJson()) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }
    });
})
```

## Rules

- Always use Form Requests — never `$request->validate()` in controllers
- Always implement `authorize()` — never return `true` without checking permissions
- Use `Rule::enum()` for enum validation (PHP 8.1+)
- Use `Rule::exists()` instead of `exists:table,column` string syntax
- Use `sometimes` for partial updates (PATCH), not `nullable`
