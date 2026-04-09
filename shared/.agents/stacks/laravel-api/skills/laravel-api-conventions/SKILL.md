---
name: laravel-api-conventions
description: Cross-project Laravel API conventions — Controller→Service→Model flow, ApiResponseTrait, FormRequest validation, API Resources, events, jobs, and testing. Use when building backend features in Projavi or DeliveryNexus.
---

# Laravel API Conventions

Shared patterns across Projavi and DeliveryNexus backends.

## Architecture (CRITICAL)

Controller → Service → Model. Controllers are thin.

```php
// Controller: validate, delegate, return resource
class OrderController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly OrderService $orderService
    ) {}

    public function store(CreateOrderRequest $request): JsonResponse
    {
        $order = $this->orderService->createOrder($request->validated());
        return $this->createdResponse(
            new OrderResource($order),
            'Order created successfully'
        );
    }
}

// Service: all business logic
class OrderService
{
    public function createOrder(array $data): Order
    {
        // Business rules, validation, orchestration
        $order = Order::create($data);
        event(new OrderCreatedEvent($order));
        return $order;
    }
}
```

## Response Format (CRITICAL)

Always use `ApiResponseTrait`. Never return raw models.

```php
use App\Traits\ApiResponseTrait;

// Envelope: { "message": "...", "data": ... }
$this->successResponse($data, 'Fetched successfully');       // 200
$this->createdResponse($data, 'Created successfully');       // 201
$this->updatedResponse($data, 'Updated successfully');       // 200
$this->deletedResponse(null, 'Deleted successfully');        // 200
$this->notFoundResponse('Resource not found');               // 404
$this->unauthorizedResponse('Authentication required');      // 401
$this->forbiddenResponse('Access denied');                   // 403
$this->validationFailedResponse($errors);                    // 422
$this->serverErrorResponse('Something went wrong');          // 500
```

## Validation (CRITICAL)

FormRequest classes. One per endpoint or action:

```php
class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth handled by middleware
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'quantity'    => ['required', 'integer', 'min:1'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ];
    }
}
```

## API Resources (CRITICAL)

One resource per model/response shape. Never return raw models from controllers:

```php
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'status'     => $this->status->value,
            'total'      => $this->total,
            'items'      => OrderItemResource::collection($this->whenLoaded('items')),
            'customer'   => new UserResource($this->whenLoaded('customer')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
```

## Auth (HIGH)

Sanctum tokens + role middleware + Socialite OAuth:

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', AdminUserController::class);
    });
});

// Middleware checks role
class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user()?->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return $next($request);
    }
}
```

## Enums (HIGH)

PHP 8.1+ backed enums for all status/type fields:

```php
enum OrderStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Shipped   = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}

// Model cast
protected $casts = [
    'status' => OrderStatus::class,
];
```

## Events & Listeners (HIGH)

Domain-grouped. Events carry data, listeners trigger side effects:

```php
// app/Events/Order/OrderCreatedEvent.php
class OrderCreatedEvent
{
    use Dispatchable, SerializesModels;
    public function __construct(public readonly Order $order) {}
}

// app/Listeners/Order/SendOrderConfirmationListener.php
class SendOrderConfirmationListener
{
    public function handle(OrderCreatedEvent $event): void
    {
        $event->order->customer->notify(new OrderConfirmationNotification($event->order));
    }
}
```

## Jobs (HIGH)

Horizon + Redis. Domain-prefixed naming:

```php
class ProcessPaymentDistributionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private readonly Order $order) {}

    public function handle(PaymentService $paymentService): void
    {
        $paymentService->distributePayment($this->order);
    }

    public int $tries = 3;
    public int $backoff = 60;
}
```

## Observers (MEDIUM)

For model lifecycle side effects (cache invalidation, search indexing):

```php
class ProductObserver
{
    public function updated(Product $product): void
    {
        Cache::forget("product_{$product->id}");
        $product->searchable(); // Scout re-index
    }
}
```

## Testing (HIGH)

Pest 3 + RefreshDatabase. PHPStan/Larastan for static analysis. Pint for style:

```php
uses(RefreshDatabase::class);

it('creates an order', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/orders', [
        'product_id' => $product->id,
        'quantity' => 2,
    ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Order created successfully');
    $this->assertDatabaseHas('orders', ['user_id' => $user->id]);
});
```

## Rules

- Controllers are thin: validate → delegate to service → return resource
- Never return raw Eloquent models from API endpoints
- Always use `ApiResponseTrait` for consistent envelope format
- One FormRequest per endpoint, one Resource per response shape
- PHP 8.1+ backed enums for all status/type columns
- Events for cross-domain side effects, jobs for async work
- Pest 3 for tests, PHPStan level 6+ for static analysis, Pint for formatting
- No API versioning — single version
- Routes grouped by role/domain, guarded by Sanctum middleware
