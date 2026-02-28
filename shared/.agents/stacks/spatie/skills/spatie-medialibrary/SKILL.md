---
name: spatie-medialibrary
description: File and media management with spatie/laravel-medialibrary. Use when attaching files to models, defining media collections, generating conversions, or serving media.
---

# Spatie Media Library

## Installation

```bash
composer require spatie/laravel-medialibrary
php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-migrations"
php artisan migrate
```

## Model setup

```php
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Product extends Model implements HasMedia
{
    use InteractsWithMedia;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->useDisk('r2')                          // use R2 or s3
            ->acceptsMimeTypes(['image/jpeg', 'image/webp', 'image/png'])
            ->singleFile();                          // only keep latest

        $this->addMediaCollection('documents')
            ->useDisk('r2')
            ->acceptsMimeTypes(['application/pdf']);
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->width(300)
            ->height(300)
            ->sharpen(10)
            ->nonQueued();                           // sync for thumbnails

        $this->addMediaConversion('preview')
            ->width(800)
            ->queued();                              // async for larger conversions
    }
}
```

## Adding media

```php
// From uploaded file
$product->addMediaFromRequest('image')
    ->toMediaCollection('images');

// From URL
$product->addMediaFromUrl('https://example.com/image.jpg')
    ->toMediaCollection('images');

// From path
$product->addMedia(storage_path('tmp/upload.jpg'))
    ->toMediaCollection('images');

// With custom properties
$product->addMediaFromRequest('document')
    ->withCustomProperties(['uploaded_by' => auth()->id()])
    ->usingFileName('product-spec.pdf')
    ->toMediaCollection('documents');
```

## Retrieving media

```php
// Get all media in collection
$images = $product->getMedia('images');

// Get first media item
$image = $product->getFirstMedia('images');

// Get URL
$url = $product->getFirstMediaUrl('images');
$thumbUrl = $product->getFirstMediaUrl('images', 'thumb');

// Check if has media
$product->hasMedia('images');
```

## In API resources

```php
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'    => $this->id,
            'name'  => $this->name,
            'image' => $this->getFirstMediaUrl('images'),
            'thumb' => $this->getFirstMediaUrl('images', 'thumb'),
            'documents' => $this->getMedia('documents')->map(fn($m) => [
                'id'   => $m->id,
                'name' => $m->file_name,
                'url'  => $m->getUrl(),
                'size' => $m->size,
            ]),
        ];
    }
}
```

## Deleting media

```php
$product->clearMediaCollection('images');          // delete all in collection
$product->getFirstMedia('images')?->delete();      // delete specific item
$media->delete();                                  // also removes file from disk
```

## Config — `config/media-library.php`

```php
return [
    'disk_name'                => env('MEDIA_DISK', 'r2'),
    'max_file_size'            => 1024 * 1024 * 10, // 10MB
    'queue_conversions_by_default' => true,
    'media_model'              => Spatie\MediaLibrary\MediaCollections\Models\Media::class,
    'temporary_upload_driver'  => 'local',
];
```

## Anti-patterns

- Don't call `getFirstMediaUrl()` in loops without eager loading — use `->load('media')`
- Don't skip `acceptsMimeTypes()` — validate file types at the collection level
- Don't use `nonQueued()` for large image conversions — it blocks the request
