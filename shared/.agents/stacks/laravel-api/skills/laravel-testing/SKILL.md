---
name: laravel-testing
description: Testing Laravel APIs with Pest PHP — feature tests, unit tests, factories, and mocking. Use when writing tests for Laravel applications.
---

# Laravel Testing

Pest PHP for Laravel API testing. Adapted from iSerter/laravel-claude-agents.

## Setup (CRITICAL)

```bash
composer require pestphp/pest pestphp/pest-plugin-laravel --dev
php artisan pest:install
```

```php
// tests/Pest.php
uses(Tests\TestCase::class)->in('Feature');
uses(Tests\TestCase::class)->in('Unit');

// Helpers available in all tests
function actingAsUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}
```

## Feature Tests (CRITICAL)

```php
// tests/Feature/Posts/CreatePostTest.php
use App\Models\{Post, User};

describe('POST /api/v1/posts', function () {
    it('creates a post for authenticated user', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/posts', [
            'title' => 'My First Post',
            'content' => 'This is the content of my post.',
            'status' => 'draft',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'title', 'slug', 'status']])
            ->assertJsonPath('data.title', 'My First Post')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('posts', [
            'title' => 'My First Post',
            'user_id' => $user->id,
        ]);
    });

    it('returns 422 for invalid data', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/posts', [
            'title' => '',  // Required
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['title', 'content']);
    });

    it('returns 401 for unauthenticated requests', function () {
        $this->postJson('/api/v1/posts', [])->assertUnauthorized();
    });
});
```

## Factories (HIGH)

```php
// database/factories/PostFactory.php
class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(),
            'slug' => fake()->unique()->slug(),
            'content' => fake()->paragraphs(3, true),
            'status' => PostStatus::Draft,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state([
            'status' => PostStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }

    public function withTags(int $count = 3): static
    {
        return $this->afterCreating(function (Post $post) use ($count) {
            $post->tags()->attach(Tag::factory()->count($count)->create());
        });
    }
}

// Usage
Post::factory()->published()->withTags(5)->create();
Post::factory()->count(10)->published()->create();
```

## Unit Tests (HIGH)

```php
// tests/Unit/Actions/CreatePostTest.php
use App\Actions\Posts\CreatePost;

describe('CreatePost action', function () {
    it('creates a post with correct attributes', function () {
        $user = User::factory()->create();
        $action = new CreatePost();

        $post = $action->handle([
            'title' => 'Test Post',
            'content' => 'Test content here.',
        ], $user);

        expect($post)
            ->title->toBe('Test Post')
            ->slug->toBe('test-post')
            ->user_id->toBe($user->id)
            ->status->toBe(PostStatus::Draft);
    });

    it('generates unique slugs for duplicate titles', function () {
        $user = User::factory()->create();
        Post::factory()->create(['slug' => 'test-post']);
        $action = new CreatePost();

        $post = $action->handle(['title' => 'Test Post', 'content' => 'Content.'], $user);

        expect($post->slug)->toBe('test-post-1');
    });
});
```

## Mocking (MEDIUM)

```php
use App\Services\NotificationService;
use App\Jobs\SendWelcomeEmail;

it('sends welcome email after registration', function () {
    // Mock the job
    Queue::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertCreated();

    Queue::assertPushed(SendWelcomeEmail::class, function ($job) {
        return $job->user->email === 'john@example.com';
    });
});

it('notifies followers when post is published', function () {
    $mock = $this->mock(NotificationService::class);
    $mock->shouldReceive('notifyFollowers')->once();

    $user = User::factory()->create();
    $post = Post::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/publish")
        ->assertOk();
});
```

## Database Assertions (MEDIUM)

```php
// Assert record exists
$this->assertDatabaseHas('posts', ['title' => 'My Post', 'user_id' => $user->id]);

// Assert record missing
$this->assertDatabaseMissing('posts', ['id' => $post->id]);

// Assert count
$this->assertDatabaseCount('posts', 5);

// Assert soft deleted
$this->assertSoftDeleted('posts', ['id' => $post->id]);
```

## Rules

- Use `RefreshDatabase` trait in feature tests — never share state between tests
- Test the HTTP layer in Feature tests, business logic in Unit tests
- Always test the unhappy path: 401, 403, 404, 422
- Use factories with states — never hardcode test data
- Mock external services (email, payment, notifications) — never hit real APIs in tests
