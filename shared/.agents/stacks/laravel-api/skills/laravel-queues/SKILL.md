---
name: laravel-queues
description: Background job processing with Laravel Queues — job classes, dispatching, retries, batching, and monitoring. Use when offloading slow or async work.
---

# Laravel Queues

## Setup (CRITICAL)

```bash
# Use database driver for simple setups, Redis for production
php artisan queue:table && php artisan migrate

# .env
QUEUE_CONNECTION=redis  # or database
```

```php
// config/queue.php — Redis with retry delay
'redis' => [
    'driver' => 'redis',
    'connection' => 'default',
    'queue' => env('REDIS_QUEUE', 'default'),
    'retry_after' => 90,
    'block_for' => null,
],
```

## Job Classes (CRITICAL)

```php
// app/Jobs/SendWelcomeEmail.php
class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 30;
    public int $backoff = 60;  // Seconds between retries

    public function __construct(
        private readonly User $user,
    ) {}

    public function handle(MailService $mail): void
    {
        $mail->sendWelcome($this->user);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Welcome email failed', [
            'user_id' => $this->user->id,
            'error' => $exception->getMessage(),
        ]);
        // Optionally notify admin
    }

    // Prevent duplicate jobs
    public function uniqueId(): string
    {
        return $this->user->id;
    }
}
```

## Dispatching (HIGH)

```php
// Dispatch immediately
SendWelcomeEmail::dispatch($user);

// Delay
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(5));

// Specific queue
SendWelcomeEmail::dispatch($user)->onQueue('emails');

// Conditionally
SendWelcomeEmail::dispatchIf($user->wantsWelcomeEmail(), $user);

// After DB transaction commits (prevents race conditions)
SendWelcomeEmail::dispatch($user)->afterCommit();
```

## Job Batching (HIGH)

```php
use Illuminate\Bus\Batch;

$batch = Bus::batch([
    new ProcessImage($post, 'thumbnail'),
    new ProcessImage($post, 'medium'),
    new ProcessImage($post, 'large'),
])
->then(function (Batch $batch) use ($post) {
    $post->update(['images_processed' => true]);
})
->catch(function (Batch $batch, Throwable $e) {
    Log::error('Image processing batch failed', ['batch_id' => $batch->id]);
})
->finally(function (Batch $batch) {
    // Always runs
})
->onQueue('media')
->dispatch();

// Track progress
$batch = Bus::findBatch($batchId);
$progress = $batch->progress();  // 0-100
```

## Chaining (MEDIUM)

```php
// Jobs run sequentially — next only runs if previous succeeds
Bus::chain([
    new ValidateOrder($order),
    new ChargePayment($order),
    new SendConfirmation($order),
    new UpdateInventory($order),
])->catch(function (Throwable $e) use ($order) {
    $order->update(['status' => 'failed']);
})->dispatch();
```

## Queue Workers (MEDIUM)

```bash
# Development
php artisan queue:work

# Production — with supervisor
php artisan queue:work redis --queue=high,default,low --tries=3 --timeout=60 --sleep=3

# Process one job and exit (for cron-based setups)
php artisan queue:work --once
```

```ini
# /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/artisan queue:work redis --sleep=3 --tries=3 --timeout=60
autostart=true
autorestart=true
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/storage/logs/worker.log
```

## Monitoring (MEDIUM)

```bash
# Check failed jobs
php artisan queue:failed

# Retry a failed job
php artisan queue:retry {id}

# Retry all failed
php artisan queue:retry all

# Flush failed jobs
php artisan queue:flush
```

## Rules

- Always implement `failed()` — log errors and notify when critical jobs fail
- Always use `afterCommit()` when dispatching inside DB transactions
- Use `uniqueId()` to prevent duplicate jobs for the same resource
- Set `$timeout` lower than `retry_after` in queue config to prevent zombie jobs
- Use separate queues for different priorities: `high`, `default`, `low`
