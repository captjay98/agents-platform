---
trigger: file_create
---

# Prefer Composition Over Inheritance

Use composition and dependency injection instead of deep inheritance hierarchies.

## TypeScript Pattern

```typescript
// Good - Composition via hooks
function useOrderManagement() {
  const payment = usePayment()
  const inventory = useInventory()
  const notifications = useNotifications()

  return { payment, inventory, notifications }
}
```

## PHP Pattern

```php
// Good - Composition
class OrderService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly InventoryService $inventoryService,
        private readonly NotificationService $notificationService,
    ) {}
}

// Avoid - Deep inheritance
class OrderService extends BaseService extends AbstractService
```

## Dart Pattern

```dart
// Good - Constructor injection
class OrderRepository {
  final ApiClient _apiClient;
  final LocalDataSource _localDataSource;

  OrderRepository(this._apiClient, this._localDataSource);
}
```

## Benefits

- Easier testing via mocking
- More flexible
- Clearer dependencies
- Avoids fragile base class problem
