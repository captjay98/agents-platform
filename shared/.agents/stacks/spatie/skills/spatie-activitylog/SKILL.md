---
name: spatie-activitylog
description: Audit logging with spatie/laravel-activitylog. Use when logging model changes, user actions, or custom events for audit trails.
---

# Spatie Activity Log

## Installation

```bash
composer require spatie/laravel-activitylog
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations"
php artisan migrate
```

## Auto-logging model changes

```php
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Order extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'total', 'notes'])   // only log these attributes
            ->logOnlyDirty()                           // only log changed attributes
            ->dontSubmitEmptyLogs()                    // skip if nothing changed
            ->setDescriptionForEvent(fn(string $eventName) => "Order {$eventName}");
    }
}
```

## Manual logging

```php
use Spatie\Activitylog\Facades\Activity;

// Simple log
activity()->log('User logged in');

// With subject and causer
activity()
    ->performedOn($order)
    ->causedBy($user)
    ->withProperties(['ip' => request()->ip()])
    ->log('Order status changed to shipped');

// Named log (separate log channel)
activity('payments')
    ->performedOn($payment)
    ->causedBy($user)
    ->withProperties(['gateway' => 'paystack', 'reference' => $ref])
    ->log('Payment processed');
```

## Querying activity

```php
// All activity for a model
$order->activities;
Activity::forSubject($order)->get();

// All activity by a user
Activity::causedBy($user)->get();

// Named log
Activity::inLog('payments')->get();

// Recent activity
Activity::latest()->take(20)->get();

// With filters
Activity::where('log_name', 'payments')
    ->where('created_at', '>=', now()->subDays(7))
    ->with(['causer', 'subject'])
    ->get();
```

## Custom properties

```php
activity()
    ->performedOn($order)
    ->causedBy(auth()->user())
    ->withProperties([
        'old_status' => $order->getOriginal('status'),
        'new_status' => $order->status,
        'reason'     => $request->reason,
    ])
    ->log('Status updated');

// Access properties
$activity->properties->get('old_status');
$activity->properties->get('new_status');
```

## Cleanup old logs

```php
// config/activitylog.php
'delete_records_older_than_days' => 365,

// Artisan command (add to scheduler)
php artisan activitylog:clean

// In scheduler
$schedule->command('activitylog:clean')->daily();
```

## Config — `config/activitylog.php`

```php
return [
    'enabled'                       => env('ACTIVITY_LOGGER_ENABLED', true),
    'delete_records_older_than_days' => 365,
    'default_log_name'              => 'default',
    'activity_model'                => \Spatie\Activitylog\Models\Activity::class,
    'table_name'                    => 'activity_log',
    'database_connection'           => env('ACTIVITY_LOG_DB_CONNECTION'),
];
```

## Anti-patterns

- Don't log sensitive fields (passwords, tokens) — use `logOnly()` to whitelist
- Don't skip `logOnlyDirty()` — without it, every save logs all attributes even if unchanged
- Don't query activity in loops — eager load with `->with(['causer', 'subject'])`
- Don't keep logs forever — schedule `activitylog:clean` to prevent table bloat
