---
name: laravel-auth
description: API authentication with Laravel Sanctum — token issuance, guards, abilities, and session vs token auth. Use when implementing authentication.
---

# Laravel Auth

Sanctum-based API authentication for SPA and mobile clients.

## Setup (CRITICAL)

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

```php
// app/Models/User.php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
}
```

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);
});
```

## Token Authentication (CRITICAL)

```php
class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = $request->user();
        $token = $user->createToken(
            name: $request->device_name ?? 'api',
            abilities: $this->getAbilitiesForUser($user),
            expiresAt: now()->addDays(30),
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): Response
    {
        // Revoke current token only
        $request->user()->currentAccessToken()->delete();
        return response()->noContent();
    }

    public function logoutAll(Request $request): Response
    {
        // Revoke all tokens
        $request->user()->tokens()->delete();
        return response()->noContent();
    }

    private function getAbilitiesForUser(User $user): array
    {
        return match(true) {
            $user->isAdmin() => ['*'],
            default => ['posts:read', 'posts:write', 'profile:read', 'profile:write'],
        };
    }
}
```

## Token Abilities (HIGH)

```php
// Check abilities in controllers
public function destroy(Post $post, Request $request): Response
{
    if (!$request->user()->tokenCan('posts:delete')) {
        abort(403, 'Token does not have delete ability.');
    }
    $this->authorize('delete', $post);
    $post->delete();
    return response()->noContent();
}

// Or use middleware
Route::delete('/posts/{post}', [PostController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'abilities:posts:delete']);
```

## Authorization with Policies (HIGH)

```php
// app/Policies/PostPolicy.php
class PostPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Post $post): bool
    {
        return $post->status === PostStatus::Published || $user->id === $post->user_id;
    }

    public function create(User $user): bool
    {
        return $user->hasVerifiedEmail();
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->isAdmin();
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->isAdmin();
    }
}

// In controller
$this->authorize('update', $post);

// In Form Request
public function authorize(): bool
{
    return $this->user()->can('update', $this->route('post'));
}
```

## Registration (MEDIUM)

```php
class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')],
            'password' => ['required', 'string', 'min:8', 'confirmed', Password::defaults()],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken($request->device_name ?? 'api');

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => new UserResource($user),
        ], 201);
    }
}
```

## Rules

- Always set token expiry — never create tokens without `expiresAt`
- Always use Policies for resource authorization — never inline `if ($user->id !== $post->user_id)`
- Revoke only the current token on logout, not all tokens (unless user requests it)
- Use token abilities for API clients with different permission levels
- Never return the token after the initial creation response
