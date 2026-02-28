---
name: cloudflare-r2-laravel
description: Cloudflare R2 object storage in Laravel via S3-compatible API. Use when configuring R2 as a filesystem disk, uploading/downloading files, or generating presigned URLs.
---

# Cloudflare R2 — Laravel

## Installation

```bash
composer require league/flysystem-aws-s3-v3
```

## Config — `config/filesystems.php`

```php
'r2' => [
    'driver' => 's3',
    'key'    => env('R2_ACCESS_KEY_ID'),
    'secret' => env('R2_SECRET_ACCESS_KEY'),
    'region' => 'auto',
    'bucket' => env('R2_BUCKET'),
    'url'    => env('R2_PUBLIC_URL'),       // CDN/public URL for public bucket
    'endpoint' => env('R2_ENDPOINT'),       // https://<account-id>.r2.cloudflarestorage.com
    'use_path_style_endpoint' => true,
    'throw'  => true,
],
```

## `.env`

```env
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://assets.yourdomain.com   # optional, for public bucket
```

## Basic operations

```php
use Illuminate\Support\Facades\Storage;

// Upload
Storage::disk('r2')->put('users/123/avatar.webp', $fileContents);
Storage::disk('r2')->putFile('uploads', $request->file('photo'));

// Upload with visibility
Storage::disk('r2')->put('public/banner.jpg', $contents, 'public');

// Download / read
$contents = Storage::disk('r2')->get('users/123/avatar.webp');
$stream   = Storage::disk('r2')->readStream('exports/report.pdf');

// Delete
Storage::disk('r2')->delete('users/123/old-avatar.webp');

// Check existence
Storage::disk('r2')->exists('users/123/avatar.webp');

// URL (public bucket with CDN)
$url = Storage::disk('r2')->url('public/banner.jpg');
// → https://assets.yourdomain.com/public/banner.jpg

// Temporary URL (presigned — requires S3-compat API)
$url = Storage::disk('r2')->temporaryUrl('private/doc.pdf', now()->addMinutes(30));
```

## File upload from request

```php
class PhotoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['photo' => 'required|image|max:5120']);

        $path = $request->file('photo')->store(
            "users/{$request->user()->id}/photos",
            'r2'
        );

        return response()->json(['path' => $path]);
    }
}
```

## Key naming conventions

```php
// Structured keys for easy management
$key = "users/{$userId}/avatars/{$uuid}.webp";
$key = "tenants/{$tenantId}/documents/{$date}/{$filename}";
$key = "exports/{$orgId}/reports/{$reportId}.pdf";
```

## Serving private files through Laravel

```php
// Don't expose R2 keys — proxy through authenticated route
Route::get('/files/{path}', function (string $path) {
    abort_unless(auth()->check(), 403);

    $userPath = "users/" . auth()->id() . "/{$path}";
    abort_unless(Storage::disk('r2')->exists($userPath), 404);

    return response()->stream(function () use ($userPath) {
        $stream = Storage::disk('r2')->readStream($userPath);
        fpassthru($stream);
    }, 200, [
        'Content-Type' => Storage::disk('r2')->mimeType($userPath),
        'Cache-Control' => 'private, max-age=300',
    ]);
})->where('path', '.*')->middleware('auth:sanctum');
```

## Spatie Media Library integration

```php
// config/media-library.php
'disk_name' => 'r2',

// Model
class Product extends Model
{
    use HasMedia;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->useDisk('r2')
            ->acceptsMimeTypes(['image/jpeg', 'image/webp', 'image/png']);
    }
}
```

## Anti-patterns

- Don't use `region` other than `'auto'` — R2 ignores it but some SDKs require a value
- Don't forget `use_path_style_endpoint => true` — R2 requires path-style, not virtual-hosted
- Don't store sensitive files in public buckets — use private + presigned or proxy route
