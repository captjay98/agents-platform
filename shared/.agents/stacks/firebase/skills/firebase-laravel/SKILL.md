---
name: firebase-laravel
description: Firebase integration in Laravel via kreait/laravel-firebase — FCM push notifications, token management, sending notifications to devices. Use when sending push notifications from Laravel to mobile apps.
---

# Firebase — Laravel (kreait)

## Installation

```bash
composer require kreait/laravel-firebase
```

## Config — `config/firebase.php`

```php
// Published via: php artisan vendor:publish --provider="Kreait\Laravel\Firebase\ServiceProvider"
return [
    'default' => env('FIREBASE_PROJECT', 'app'),
    'projects' => [
        'app' => [
            'credentials' => env('FIREBASE_CREDENTIALS'),  // path to service account JSON
            'database' => [
                'url' => env('FIREBASE_DATABASE_URL'),
            ],
        ],
    ],
];
```

## `.env`

```env
FIREBASE_CREDENTIALS=/path/to/firebase-service-account.json
# Or inline JSON:
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"..."}'
```

## Sending FCM notifications

```php
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class PushNotificationService
{
    public function __construct(
        private readonly Messaging $messaging,
    ) {}

    public function sendToDevice(string $fcmToken, string $title, string $body, array $data = []): void
    {
        $message = CloudMessage::withTarget('token', $fcmToken)
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        $this->messaging->send($message);
    }

    public function sendToMultipleDevices(array $fcmTokens, string $title, string $body, array $data = []): void
    {
        if (empty($fcmTokens)) return;

        $message = CloudMessage::new()
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        $report = $this->messaging->sendMulticast($message, $fcmTokens);

        // Clean up invalid tokens
        if ($report->hasFailures()) {
            $invalidTokens = [];
            foreach ($report->failures()->getItems() as $failure) {
                if ($this->isInvalidToken($failure->error())) {
                    $invalidTokens[] = $failure->target()->value();
                }
            }
            if ($invalidTokens) {
                $this->removeInvalidTokens($invalidTokens);
            }
        }
    }

    public function sendToTopic(string $topic, string $title, string $body, array $data = []): void
    {
        $message = CloudMessage::withTarget('topic', $topic)
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        $this->messaging->send($message);
    }

    private function isInvalidToken(\Throwable $error): bool
    {
        $message = $error->getMessage();
        return str_contains($message, 'UNREGISTERED')
            || str_contains($message, 'INVALID_ARGUMENT');
    }

    private function removeInvalidTokens(array $tokens): void
    {
        UserDevice::whereIn('fcm_token', $tokens)->delete();
    }
}
```

## FCM token management

```php
// Migration
Schema::create('user_devices', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('fcm_token')->unique();
    $table->string('platform')->nullable(); // ios, android
    $table->timestamp('last_seen_at')->nullable();
    $table->timestamps();
});

// Store token on login
class DeviceController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->validate(['fcm_token' => 'required|string', 'platform' => 'nullable|in:ios,android']);

        UserDevice::updateOrCreate(
            ['fcm_token' => $request->fcm_token],
            [
                'user_id'      => $request->user()->id,
                'platform'     => $request->platform,
                'last_seen_at' => now(),
            ],
        );

        return response()->json(['status' => 'ok']);
    }
}
```

## Notification class integration

```php
use Illuminate\Notifications\Notification;
use Kreait\Firebase\Messaging\CloudMessage;

class OrderShippedNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database', 'fcm'];  // custom channel
    }

    public function toFcm(object $notifiable): CloudMessage
    {
        $tokens = $notifiable->devices()->pluck('fcm_token')->toArray();

        return CloudMessage::new()
            ->withNotification(\Kreait\Firebase\Messaging\Notification::create(
                'Order Shipped',
                "Your order #{$this->order->id} is on its way!",
            ))
            ->withData([
                'route'    => "/orders/{$this->order->id}",
                'order_id' => (string) $this->order->id,
            ]);
    }
}
```

## Anti-patterns

- Don't store FCM tokens in the users table — use a separate `user_devices` table (one user, many devices)
- Don't ignore send failures — clean up invalid/unregistered tokens
- Don't send large payloads in `data` — FCM has a 4KB limit
- Don't commit service account JSON to git — use env variable or secrets manager
