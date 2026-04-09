---
name: bouncer-laravel
description: Fine-grained authorization with silber/bouncer for Laravel. Use when defining abilities, roles, and ownership-based access control.
---

> **Choose one:** Use Bouncer OR spatie/laravel-permission — not both. Bouncer is preferred when you need ownership-based abilities (`toOwn()`); Spatie is preferred for simpler role/permission CRUD.

# Bouncer Laravel

## Installation

```bash
composer require silber/bouncer
php artisan vendor:publish --tag="bouncer.migrations"
php artisan migrate
```

Add the `HasRoles` trait to your `User` model:

```php
use Silber\Bouncer\Database\HasRolesAndAbilities;

class User extends Authenticatable
{
    use HasRolesAndAbilities;
}
```

## Defining Abilities

```php
// Allow a specific user
Bouncer::allow($user)->to('edit', Post::class);

// Allow a role
Bouncer::allow('admin')->to('manage', Post::class);

// Ownership-based: allow users to edit their own posts
Bouncer::allow('editor')->toOwn(Post::class)->to('edit');
```

## Assigning Roles

```php
Bouncer::assign('admin')->to($user);
Bouncer::assign('editor')->to($user);

// Retract a role
Bouncer::retract('editor')->from($user);
```

## Checking Abilities

```php
// In controllers / services
if ($user->cannot('edit', $post)) {
    abort(403);
}

// Gate facade
Gate::allows('edit', $post);

// Blade
@can('edit', $post)
    <button>Edit</button>
@endcan
```

## Forbidding Abilities

```php
// Explicitly deny even if a role grants it
Bouncer::forbid($user)->to('delete', Post::class);

// Unforbid
Bouncer::unforbid($user)->to('delete', Post::class);
```

## Seeding Roles and Abilities

```php
// database/seeders/RolesAndAbilitiesSeeder.php
public function run(): void
{
    Bouncer::allow('admin')->to('manage', '*');

    Bouncer::allow('editor')->to(['create', 'edit'], Post::class);
    Bouncer::allow('editor')->toOwn(Post::class)->to('delete');

    Bouncer::allow('viewer')->to('view', Post::class);
}
```

## Caching

Bouncer caches all permissions per request. Refresh after changes:

```php
Bouncer::refresh();          // clear all cache
Bouncer::refreshFor($user);  // clear for one user
```

In tests, call `Bouncer::refresh()` in `setUp()` to avoid stale state.

## Policy Integration

Bouncer integrates with Laravel's Gate automatically. You can still define Policy classes — Bouncer checks run alongside them.

```php
// Register policy as normal; Bouncer abilities take precedence when defined
Gate::policy(Post::class, PostPolicy::class);
```

## Common Patterns

```php
// Check before acting in a service
public function deletePost(User $user, Post $post): void
{
    if ($user->cannot('delete', $post)) {
        throw new AuthorizationException('Not allowed to delete this post.');
    }

    $post->delete();
}

// Middleware-based route protection
Route::delete('/posts/{post}', [PostController::class, 'destroy'])
    ->middleware('can:delete,post');
```
