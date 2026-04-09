---
name: laravel-security
description: Security hardening for Laravel APIs — input sanitization, rate limiting, CORS, SQL injection prevention, and common vulnerability mitigations.
---

# Laravel Security

## Rate Limiting (CRITICAL)

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

public function boot(): void
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('auth', function (Request $request) {
        return [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perMinute(3)->by($request->input('email')),
        ];
    });

    RateLimiter::for('uploads', function (Request $request) {
        return Limit::perHour(20)->by($request->user()->id);
    });
}
```

```php
// routes/api.php
Route::middleware(['throttle:auth'])->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Authenticated routes
});
```

## Mass Assignment Protection (CRITICAL)

```php
// ✅ Always whitelist
class Post extends Model
{
    protected $fillable = ['title', 'content', 'status'];
}

// ❌ Never do this
protected $guarded = [];

// ✅ Use validated() in controllers — never $request->all()
$post = Post::create($request->validated());
```

## SQL Injection Prevention (CRITICAL)

```php
// ✅ Always use parameter binding
$posts = DB::select('SELECT * FROM posts WHERE user_id = ?', [$userId]);

// ✅ Eloquent is safe by default
$posts = Post::where('user_id', $userId)->get();

// ❌ Never interpolate user input into queries
$posts = DB::select("SELECT * FROM posts WHERE title = '$title'");

// ✅ Raw expressions with bindings
$posts = Post::whereRaw('LOWER(title) LIKE ?', ["%{$search}%"])->get();
```

## File Upload Security (HIGH)

```php
public function rules(): array
{
    return [
        'avatar' => [
            'required',
            'file',
            'mimes:jpg,jpeg,png,webp',  // Whitelist MIME types
            'max:2048',                  // 2MB max
            'dimensions:min_width=100,min_height=100,max_width=2000,max_height=2000',
        ],
    ];
}

public function store(UploadAvatarRequest $request): JsonResponse
{
    $file = $request->file('avatar');

    // Store outside public directory, serve via signed URL
    $path = $file->store('avatars', 'private');

    // Generate signed URL for access
    $url = Storage::temporaryUrl($path, now()->addHour());

    return response()->json(['url' => $url]);
}
```

## CORS Configuration (HIGH)

```php
// config/cors.php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => false,
];

// .env
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Sensitive Data (HIGH)

```php
// Never log sensitive fields
class User extends Authenticatable
{
    protected $hidden = ['password', 'remember_token', 'two_factor_secret'];
}

// Mask in logs
Log::info('User login', [
    'user_id' => $user->id,
    'email' => Str::mask($user->email, '*', 3),  // jo***@example.com
    'ip' => $request->ip(),
]);

// Never return tokens after creation
// ✅ Return only on initial creation
return response()->json(['token' => $token->plainTextToken]);
// ❌ Never include in user profile responses
```

## Security Headers (MEDIUM)

```php
// app/Http/Middleware/SecurityHeaders.php
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        // X-XSS-Protection is deprecated in modern browsers. Use Content-Security-Policy instead.
        $response->headers->set('Content-Security-Policy', "default-src 'self'");
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return $response;
    }
}
```

## Rules

- Always use `$request->validated()` for mass assignment — never `$request->all()`. Individual field access with `$request->input()` is fine for non-mass-assignment reads.
- Always rate-limit auth endpoints separately from API endpoints
- Never store files in `public/` — use `private` disk with signed URLs
- Never log passwords, tokens, or full email addresses
- Validate file MIME types server-side — never trust client-provided content type
