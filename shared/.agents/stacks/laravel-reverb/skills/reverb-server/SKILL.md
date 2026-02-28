---
name: reverb-server
description: Laravel Reverb WebSocket server setup and broadcasting. Use when configuring Reverb, creating broadcast events, defining channels, or deploying the WebSocket server.
---

# Laravel Reverb — Server

## Installation

```bash
composer require laravel/reverb
php artisan reverb:install
```

## `.env`

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=http

# For clients connecting (may differ from server bind address)
REVERB_SERVER_HOST=localhost
REVERB_SERVER_PORT=8080
```

## `config/broadcasting.php`

```php
'reverb' => [
    'driver'  => 'reverb',
    'key'     => env('REVERB_APP_KEY'),
    'secret'  => env('REVERB_APP_SECRET'),
    'app_id'  => env('REVERB_APP_ID'),
    'options' => [
        'host'   => env('REVERB_HOST'),
        'port'   => env('REVERB_PORT', 443),
        'scheme' => env('REVERB_SCHEME', 'https'),
        'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
    ],
],
```

## Broadcast event

```php
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class OrderStatusUpdated implements ShouldBroadcast
{
    public function __construct(
        public readonly Order $order,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("orders.{$this->order->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    // Only broadcast specific fields — don't expose full model
    public function broadcastWith(): array
    {
        return [
            'id'     => $this->order->id,
            'status' => $this->order->status,
            'updated_at' => $this->order->updated_at->toISOString(),
        ];
    }
}

// Dispatch
broadcast(new OrderStatusUpdated($order))->toOthers();
// or
OrderStatusUpdated::dispatch($order);
```

## Channel authorization — `routes/channels.php`

```php
use Illuminate\Support\Facades\Broadcast;

// Private channel — user must own the order
Broadcast::channel('orders.{orderId}', function (User $user, int $orderId) {
    return Order::where('id', $orderId)
        ->where('user_id', $user->id)
        ->exists();
});

// Presence channel — returns user data on join
Broadcast::channel('chat.{roomId}', function (User $user, int $roomId) {
    if (ChatRoom::where('id', $roomId)->whereHas('members', fn($q) => $q->where('user_id', $user->id))->exists()) {
        return ['id' => $user->id, 'name' => $user->name];
    }
});
```

## Channel types

```php
new Channel('public-channel')          // anyone can subscribe
new PrivateChannel('private-channel')  // requires auth
new PresenceChannel('presence-channel') // auth + member list
```

## Running Reverb

```bash
# Development
php artisan reverb:start

# Production (Supervisor)
# /etc/supervisor/conf.d/reverb.conf
[program:reverb]
command=php /var/www/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
```

## Horizon integration (queue broadcasting)

```php
// Ensure queue worker is running — broadcast events are queued by default
// ShouldBroadcast uses the default queue
// ShouldBroadcastNow skips the queue
class OrderStatusUpdated implements ShouldBroadcastNow { ... }
```

## Anti-patterns

- Don't broadcast full Eloquent models — use `broadcastWith()` to limit exposed data
- Don't use public channels for user-specific data — always use `PrivateChannel`
- Don't forget to run queue worker — `ShouldBroadcast` events are queued by default
- Don't expose Reverb port directly in production — proxy through Nginx/Caddy with TLS
