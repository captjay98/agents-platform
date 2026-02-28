---
name: nomba-laravel
description: Nomba payment integration in Laravel. Use when implementing payment initialization, verification, or webhook handling via Nomba API.
---

# Nomba — Laravel

## Config — `config/payment.php`

```php
'nomba' => [
    'api_key'        => env('NOMBA_API_KEY'),
    'account_id'     => env('NOMBA_ACCOUNT_ID'),
    'base_url'       => env('NOMBA_BASE_URL', 'https://api.nomba.com'),
    'webhook_secret' => env('NOMBA_WEBHOOK_SECRET'),
],
```

## Gateway implementation

```php
class NombaGateway implements PaymentGatewayInterface
{
    private string $apiKey;
    private string $baseUrl;
    private ?string $webhookSecret;

    public function __construct()
    {
        $this->apiKey        = config('payment.nomba.api_key');
        $this->baseUrl       = config('payment.nomba.base_url', 'https://api.nomba.com');
        $this->webhookSecret = config('payment.nomba.webhook_secret');
    }

    public function initializePayment(float $amount, array $metadata): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ])->post("{$this->baseUrl}/v1/payments", [
            'amount'         => (int) round($amount * 100), // kobo
            'currency'       => $metadata['currency'] ?? 'NGN',
            'reference'      => $metadata['reference'],
            'callback_url'   => $metadata['callback_url'] ?? null,
            'customer_email' => $metadata['email'],
            'metadata'       => [
                'order_id'   => $metadata['order_id'] ?? null,
                'user_id'    => $metadata['user_id'] ?? null,
                'tenant_id'  => $metadata['tenant_id'] ?? null,
            ],
        ]);

        $data = $response->json();

        if (! $response->successful() || ! ($data['success'] ?? false)) {
            throw new PaymentException("Nomba init failed: " . ($data['message'] ?? 'Unknown'));
        }

        return [
            'authorization_url' => $data['data']['payment_url'] ?? $data['data']['authorization_url'],
            'access_code'       => $data['data']['payment_token'] ?? null,
            'reference'         => $data['data']['reference'],
        ];
    }

    public function verifyPayment(string $reference): bool
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
        ])->get("{$this->baseUrl}/v1/payments/{$reference}");

        $data = $response->json();

        return $response->successful()
            && ($data['success'] ?? false)
            && in_array($data['data']['status'] ?? '', ['successful', 'success', 'completed']);
    }

    public function handleWebhook(array $payload): bool
    {
        $eventType = $payload['type'] ?? $payload['event'] ?? '';
        $isPaid    = in_array($eventType, ['payment.successful', 'charge.success', 'transaction.successful']);

        if (! $isPaid) return true;

        $reference = $payload['data']['reference'] ?? $payload['id'] ?? $payload['eventId'] ?? null;
        if (! $reference) return false;

        return DB::transaction(function () use ($reference, $payload) {
            $payment = Payment::where('reference', $reference)->lockForUpdate()->first();
            if (! $payment || $payment->status === 'paid') return true; // idempotent

            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            ProcessPaymentFulfillment::dispatch($payment);
            return true;
        });
    }
}
```

## Webhook controller

```php
class NombaWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $signature = $request->header('x-nomba-signature') ?? '';
        $secret    = config('payment.nomba.webhook_secret');
        $computed  = hash_hmac('sha256', $request->getContent(), $secret);

        if (! hash_equals($computed, $signature)) {
            return response('Unauthorized', 401);
        }

        $gateway = app(NombaGateway::class);
        $gateway->handleWebhook($request->json()->all());

        return response('OK', 200);
    }
}
```

## Checkout URL (alternative to API)

```php
// Nomba also supports a hosted checkout page
$url = 'https://checkout.nomba.com/pay?' . http_build_query([
    'amount'       => (int) round($amount * 100),
    'currency'     => 'NGN',
    'reference'    => $reference,
    'callback_url' => $callbackUrl,
    'email'        => $email,
    'metadata'     => json_encode($metadata),
]);
```

## Anti-patterns

- Don't skip idempotency — Nomba may retry webhooks; always check if reference already processed
- Don't use `==` for signature comparison — use `hash_equals()` for timing-safe comparison
- Don't rely solely on callback URL for payment confirmation — always verify via webhook
