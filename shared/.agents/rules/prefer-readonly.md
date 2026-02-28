---
trigger: file_edit
---

# Prefer Readonly/Immutability

Use readonly/final/const wherever possible to prevent bugs.

## TypeScript

```typescript
// Readonly properties
interface User {
  readonly id: string
  readonly createdAt: Date
  name: string // mutable
}

// Const assertions
const ROLES = ['admin', 'user', 'guest'] as const

// Readonly arrays
function process(items: readonly string[]) {}
```

## PHP 8.4

```php
// Readonly class
readonly class CreateProductDTO
{
    public function __construct(
        public string $name,
        public float $price,
    ) {}
}

// Readonly properties
public function __construct(
    private readonly ProductService $productService,
) {}
```

## Dart

```dart
// Final variables
final String name;
final List<Product> products;

// Const constructors
const User({required this.id, required this.name});
```

## Benefits

- Prevents accidental mutation
- Clearer intent
- Easier to reason about
- Better for concurrent code
