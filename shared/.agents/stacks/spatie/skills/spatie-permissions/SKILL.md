---
name: spatie-permissions
description: Role and permission management with spatie/laravel-permission. Use when assigning roles, checking permissions, protecting routes, or seeding roles/permissions.
---

# Spatie Laravel Permission

## Installation

```bash
composer require spatie/laravel-permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan migrate
```

## Model setup

```php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;
}
```

## Roles and permissions

```php
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

// Create
Role::create(['name' => 'admin']);
Role::create(['name' => 'manager']);
Permission::create(['name' => 'edit posts']);
Permission::create(['name' => 'delete posts']);

// Assign permissions to role
$adminRole = Role::findByName('admin');
$adminRole->givePermissionTo(['edit posts', 'delete posts']);

// Assign role to user
$user->assignRole('admin');
$user->assignRole(['admin', 'manager']);

// Remove
$user->removeRole('manager');
$user->syncRoles(['admin']); // replaces all roles
```

## Checking permissions

```php
// Direct checks
$user->hasRole('admin');
$user->hasAnyRole(['admin', 'manager']);
$user->hasAllRoles(['admin', 'manager']);
$user->can('edit posts');
$user->hasPermissionTo('edit posts');

// In controllers
abort_unless($request->user()->can('edit posts'), 403);
$this->authorize('edit posts');
```

## Middleware

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class);
});

Route::middleware(['auth:sanctum', 'permission:edit posts'])->group(function () {
    Route::put('/posts/{post}', [PostController::class, 'update']);
});

// Multiple roles
Route::middleware(['role:admin|manager'])->group(...);
```

## Seeding roles and permissions

```php
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view users', 'create users', 'edit users', 'delete users',
            'view orders', 'manage orders',
            'view reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        Role::firstOrCreate(['name' => 'admin'])
            ->syncPermissions(Permission::all());

        Role::firstOrCreate(['name' => 'manager'])
            ->syncPermissions(['view users', 'view orders', 'manage orders', 'view reports']);

        Role::firstOrCreate(['name' => 'staff'])
            ->syncPermissions(['view orders', 'manage orders']);
    }
}
```

## API responses — include roles/permissions

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'roles'       => $this->getRoleNames(),
            'permissions' => $this->getAllPermissions()->pluck('name'),
        ];
    }
}
```

## Cache management

```php
// Spatie caches permissions — clear after seeding or changes
app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

// Or via artisan
php artisan permission:cache-reset
```

## Multi-tenancy (guard per tenant)

```php
// Assign role with specific guard
$user->assignRole(Role::findByName('admin', 'api'));
$user->hasRole('admin', 'api');
```

## Anti-patterns

- Don't check permissions in Blade/frontend only — always enforce server-side
- Don't forget to clear permission cache after seeding in production
- Don't create permissions dynamically at runtime — define them in seeders
- Don't use `can()` on unauthenticated users without null check
