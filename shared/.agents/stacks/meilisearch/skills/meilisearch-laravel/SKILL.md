---
name: meilisearch-laravel
description: Full-text search with Meilisearch in Laravel via Laravel Scout. Use when configuring Scout, making models searchable, defining filterable/sortable attributes, or building search endpoints.
---

# Meilisearch — Laravel

## Installation

```bash
composer require laravel/scout meilisearch/meilisearch-php
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"
```

## `.env`

```env
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=your_master_key
```

## Make model searchable

```php
use Laravel\Scout\Searchable;

class Product extends Model
{
    use Searchable;

    // Fields to index
    public function toSearchableArray(): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'category'    => $this->category?->name,
            'price'       => $this->price,
            'status'      => $this->status,
            'tenant_id'   => $this->tenant_id,
        ];
    }

    // Custom index name (default: table name)
    public function searchableAs(): string
    {
        return 'products';
    }
}
```

## Index settings (run once or in migration)

```php
use Meilisearch\Client;

$client = new Client(config('scout.meilisearch.host'), config('scout.meilisearch.key'));

$client->index('products')->updateSettings([
    'searchableAttributes' => ['name', 'description', 'category'],
    'filterableAttributes' => ['status', 'tenant_id', 'category', 'price'],
    'sortableAttributes'   => ['price', 'created_at', 'name'],
    'rankingRules'         => ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    'typoTolerance'        => ['enabled' => true, 'minWordSizeForTypos' => ['oneTypo' => 4, 'twoTypos' => 8]],
]);
```

## Searching

```php
// Basic search
$products = Product::search('laptop')->get();

// With filters (requires filterableAttributes)
$products = Product::search('laptop')
    ->where('status', 'active')
    ->where('tenant_id', $tenantId)
    ->get();

// With pagination
$products = Product::search($query)
    ->where('tenant_id', $tenantId)
    ->paginate(20);

// With sorting
$products = Product::search($query)
    ->orderBy('price', 'asc')
    ->get();

// Raw Meilisearch options
$products = Product::search($query, function ($meilisearch, $query, $options) {
    $options['filter'] = "tenant_id = {$tenantId} AND price < 10000";
    $options['sort']   = ['price:asc'];
    $options['limit']  = 20;
    return $meilisearch->search($query, $options);
})->get();
```

## Search controller

```php
class ProductSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => 'nullable|string|max:100']);

        $query = $request->string('q', '');

        $results = Product::search($query)
            ->where('tenant_id', $request->user()->tenant_id)
            ->where('status', 'active')
            ->paginate(20);

        return response()->json([
            'data'  => ProductResource::collection($results),
            'meta'  => [
                'total'        => $results->total(),
                'current_page' => $results->currentPage(),
                'last_page'    => $results->lastPage(),
            ],
        ]);
    }
}
```

## Indexing commands

```bash
# Import all records
php artisan scout:import "App\Models\Product"

# Flush index
php artisan scout:flush "App\Models\Product"

# Delete index
php artisan scout:delete-index products
```

## Keeping index in sync

```php
// Scout auto-syncs on model save/delete via observer
// For bulk operations, use unsearchable/searchable
Product::where('status', 'archived')->unsearchable();
Product::where('status', 'active')->searchable();
```

## Anti-patterns

- Don't filter on non-filterable attributes — Meilisearch will throw an error
- Don't index sensitive fields (passwords, tokens, PII) — index only what's needed for search
- Don't skip `tenant_id` filter in multi-tenant apps — users would see other tenants' data
- Don't run `scout:import` in production without testing — it replaces the entire index
