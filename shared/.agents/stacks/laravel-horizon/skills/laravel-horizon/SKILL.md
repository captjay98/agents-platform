---
name: laravel-horizon
description: Laravel Horizon queue monitoring and management. Use when configuring Horizon, defining queue workers, setting up supervisors, monitoring jobs, or handling failed jobs.
---

# Laravel Horizon

## Installation

```bash
composer require laravel/horizon
php artisan horizon:install
```

## `config/horizon.php` — key sections

```php
return [
    'use'     => 'default',
    'prefix'  => env('HORIZON_PREFIX', 'horizon:'),
    'middleware' => ['web'],
    'waits'   => ['redis:default' => 60],
    'trim'    => [
        'recent'        => 60,   // minutes
        'pending'       => 60,
        'completed'     => 60,
        'recent_failed' => 10080, // 1 week
        'failed'        => 10080,
        'monitored'     => 10080,
    ],

    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue'      => ['high', 'default', 'low'],
                'balance'    => 'auto',
                'minProcesses' => 1,
                'maxProcesses' => 10,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
                'tries'      => 3,
                'timeout'    => 60,
            ],
            'supervisor-notifications' => [
                'connection' => 'redis',
                'queue'      => ['notifications'],
                'balance'    => 'simple',
                'processes'  => 3,
                'tries'      => 3,
            ],
        ],
        'local' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue'      => ['high', 'default', 'low', 'notifications'],
                'balance'    => 'simple',
                'processes'  => 3,
                'tries'      => 3,
            ],
        ],
    ],
];
```

## Queue priorities

```php
// Dispatch to specific queues
ProcessPayment::dispatch($payment)->onQueue('high');
SendWelcomeEmail::dispatch($user)->onQueue('notifications');
GenerateReport::dispatch($report)->onQueue('low');

// Job class default queue
class ProcessPayment implements ShouldQueue
{
    public $queue = 'high';
    public $tries = 3;
    public $timeout = 30;
    public $backoff = [10, 30, 60]; // retry delays in seconds
}
```

## Dashboard access control

```php
// app/Providers/AppServiceProvider.php
use Laravel\Horizon\Horizon;

public function boot(): void
{
    Horizon::auth(function (Request $request) {
        return $request->user()?->hasRole('admin') ?? false;
    });
}
```

## Running Horizon

```bash
# Development
php artisan horizon

# Production (Supervisor)
# /etc/supervisor/conf.d/horizon.conf
[program:horizon]
command=php /var/www/artisan horizon
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/horizon.log
stopwaitsecs=3600  # allow jobs to finish gracefully
```

## Graceful restart on deploy

```bash
# After deploying new code — gracefully restarts workers
php artisan horizon:terminate
# Supervisor will restart it automatically
```

## Failed job handling

```php
// Retry failed jobs
php artisan queue:retry all
php artisan queue:retry <job-id>

// Forget failed jobs
php artisan queue:forget <job-id>
php artisan queue:flush

// In job class — handle failure
public function failed(Throwable $exception): void
{
    Log::error('Job failed', [
        'job'   => static::class,
        'error' => $exception->getMessage(),
    ]);
    // notify, cleanup, etc.
}
```

## Monitoring specific queues

```php
// Tag jobs for monitoring
class ProcessOrder implements ShouldQueue
{
    public function tags(): array
    {
        return ['order', "order:{$this->order->id}", "tenant:{$this->order->tenant_id}"];
    }
}
```

## Redis config — `config/database.php`

```php
'redis' => [
    'horizon' => [
        'url'      => env('REDIS_URL'),
        'host'     => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port'     => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_HORIZON_DB', '1'), // separate DB from cache
    ],
],
```

## Anti-patterns

- Don't run `php artisan queue:work` alongside Horizon — Horizon manages workers
- Don't use `balance: auto` in local env — it spawns too many processes
- Don't skip `horizon:terminate` on deploy — old workers will run stale code
- Don't put everything in `default` queue — use priorities for time-sensitive jobs
