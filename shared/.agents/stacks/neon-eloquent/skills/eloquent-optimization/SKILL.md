---
name: eloquent-optimization
description: Optimizing Laravel Eloquent queries for Neon Serverless Postgres — connection pooling, query optimization, and Neon-specific patterns. Use when building Laravel apps on Neon.
---

# Eloquent Optimization for Neon

Neon-specific patterns for Laravel Eloquent — connection pooling, cold start handling, and query optimization.

## Connection Setup (CRITICAL)

```bash
composer require neondatabase/neon-laravel
```

```env
# .env
DB_CONNECTION=pgsql
DB_HOST=ep-xxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_DATABASE=dbname
DB_USERNAME=user
DB_PASSWORD=password
DB_SSLMODE=require

# Pooled connection for web requests (PgBouncer)
DB_HOST_POOLED=ep-xxx-pooler.us-east-2.aws.neon.tech
```

```php
// config/database.php — use pooled connection for web, direct for migrations
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST_POOLED', env('DB_HOST')),  // Pooled for app
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'sslmode' => env('DB_SSLMODE', 'require'),
    'options' => [
        PDO::ATTR_PERSISTENT => false,  // No persistent connections with PgBouncer
    ],
],

// Separate connection for migrations (direct, not pooled)
'pgsql_direct' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),  // Direct connection
    // ... same as above
],
```

```bash
# Run migrations on direct connection
php artisan migrate --database=pgsql_direct
```

## Cold Start Handling (HIGH)

Neon computes can suspend after inactivity. Handle connection errors gracefully:

```php
// app/Providers/AppServiceProvider.php
public function boot(): void
{
    // Retry on connection errors (Neon cold start)
    DB::whenQueryingForLongerThan(5000, function () {
        Log::warning('Slow database query detected');
    });
}
```

```php
// For critical operations — retry on connection failure
function withNeonRetry(callable $fn, int $retries = 2): mixed
{
    try {
        return $fn();
    } catch (QueryException $e) {
        if ($retries > 0 && str_contains($e->getMessage(), 'connection')) {
            sleep(1);
            return withNeonRetry($fn, $retries - 1);
        }
        throw $e;
    }
}
```

## Query Optimization (HIGH)

Same Eloquent best practices apply, but Neon's serverless nature makes them more important:

```php
// ✅ Eager load — critical for serverless (each query = potential cold start)
$posts = Post::with(['user:id,name', 'tags'])
    ->withCount('comments')
    ->select(['id', 'title', 'user_id', 'status', 'published_at'])
    ->published()
    ->paginate(15);

// ✅ Chunk for large datasets — avoid memory issues
Post::chunk(500, function ($posts) {
    foreach ($posts as $post) {
        // Process
    }
});

// ✅ Use database-level operations
Post::where('status', 'draft')
    ->where('created_at', '<', now()->subDays(30))
    ->update(['status' => 'archived']);
```

## Neon Branching with Laravel (HIGH)

```bash
# Create branch for PR
neonctl branches create --name preview/pr-123 --parent main

# Get connection string
neonctl connection-string preview/pr-123

# Set in PR environment
DB_HOST=ep-xxx-preview.us-east-2.aws.neon.tech

# Run migrations on branch
php artisan migrate --database=pgsql_direct

# Delete after PR merges
neonctl branches delete preview/pr-123
```

## PostgreSQL-Specific Eloquent (MEDIUM)

Neon is Postgres — use Postgres features:

```php
// JSON columns
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->jsonb('metadata')->nullable();  // jsonb is faster than json
    $table->tsvector('search_vector')->nullable();  // Full-text search
});

// Query JSON
$posts = Post::whereJsonContains('metadata->tags', 'laravel')->get();
$posts = Post::whereJsonPath('metadata', '$.featured', true)->get();

// Full-text search
$posts = Post::whereRaw(
    "search_vector @@ plainto_tsquery('english', ?)",
    [$searchTerm]
)->get();

// UUID primary keys (Postgres native)
Schema::create('posts', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
});
```

## Connection Pooling Rules (MEDIUM)

PgBouncer (Neon's pooler) has limitations:

```php
// ❌ Prepared statements don't work with PgBouncer in transaction mode
// Laravel uses prepared statements by default — disable for pooled connections
'options' => [
    PDO::ATTR_EMULATE_PREPARES => true,  // Use emulated prepared statements
],

// ❌ SET LOCAL and advisory locks don't work across pooled connections
// ✅ Use application-level locking instead
Cache::lock("post-{$postId}", 10)->block(5, function () use ($postId) {
    // Critical section
});
```

## Rules

- Always use pooled connection for web requests, direct connection for migrations
- Never use `PDO::ATTR_PERSISTENT` with PgBouncer — it breaks connection pooling
- Always set `sslmode=require` — Neon requires SSL
- Use Neon branching for preview environments — never share production database
- Prefer `jsonb` over `json` for JSON columns in Postgres
