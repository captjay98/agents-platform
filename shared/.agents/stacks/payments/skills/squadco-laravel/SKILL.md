---
name: squadco-laravel
description: Squad (SquadCo) payment integration in Laravel. Use when implementing payment initialization, verification, or webhook handling via Squad API.
---

# Squad — Laravel

## Config — `config/payment.php`

```php
'squad' => [
    'secret_key'     => env('SQUAD_SECRET_KEY'),
    'public_key'     => env('SQUAD_PUBLIC_KEY'),
    'base_url'       => env('SQUAD_BASE_URL', 'https://api.squadco.com'),
    'webhook_secret' => env('SQUAD_WEBHOOK_SECRET'),
],
```

## Gateway implementation

```php
class SquadGateway implements PaymentGatewayInterface
{
    private string $secretKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('payment.squad.secret_key');
        $this->baseUrl   = config('payment.squad.base_url', 'https://api.squadco.com');
    }

    public function initializePayment(float $amount, array $metadata): array
    {
        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/transaction/initiate", [
                'email'        => $metadata['email'],
                'amount'       => (int) round($amount * 100), // kobo
                'currency'     => $metadata['currency'] ?? 'NGN',
                'transaction_ref' => $metadata['reference'],
                'callback_url' => $metadata['callback_url'] ?? null,
                'customer_name' => $metadata['customer_name'] ?? null,
                'metadata'     => [
                    'order_id'  => $metadata['order_id'] ?? null,
                    'user_id'   => $metadata['user_id'] ?? null,
                    'tenant_id' => $metadata['tenant_id'] ?? null,
                ],
            ]);

        $data = $response->json();

        if (! $response->successful() || ($data['status'] ?? 0) !== 200) {
            throw new PaymentException("Squad init failed: " . ($data['message'] ?? 'Unknown'));
        }

        return [
            'authorization_url' => $data['data']['checkout_url'],
            'access_code'       => $data['data']['transaction_ref'] ?? null,
            'reference'         => $data['data']['transaction_ref'],
        ];
    }

    public function verifyPayment(string $reference): bool
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        $data = $response->json();

        return $response->successful()
            && ($data['status'] ?? 0) === 200
            && ($data['data']['transaction_status'] ?? '') === 'Success';
    }

    public function handleWebhook(array $payload): bool
    {
        $event = $payload['Event'] ?? $payload['event'] ?? '';

        if ($event !== 'charge_successful') return true;

        $reference = $payload['Body']['transaction_ref']
            ?? $payload['data']['transaction_ref']
            ?? null;

        if (! $reference) return false;

        return DB::transaction(function () use ($reference) {
            $payment = Payment::where('reference', $reference)->lockForUpdate()->first();
            if (! $payment || $payment->status === 'paid') return true;

            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            ProcessPaymentFulfillment::dispatch($payment);
            return true;
        });
    }
}
```

## Webhook controller

```php
class SquadWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        // Squad uses x-squad-encrypted-body header for signature
        $signature = $request->header('x-squad-encrypted-body') ?? '';
        $secret    = config('payment.squad.webhook_secret');
        $computed  = strtoupper(hash_hmac('sha512', $request->getContent(), $secret));

        if (! hash_equals($computed, strtoupper($signature))) {
            return response('Unauthorized', 401);
        }

        app(SquadGateway::class)->handleWebhook($request->json()->all());

        return response('OK', 200);
    }
}
```

## Squad-specific notes

```php
// Squad uses different field names than Paystack:
// - 'transaction_ref' not 'reference'
// - 'checkout_url' not 'authorization_url'
// - 'transaction_status' === 'Success' (capital S)
// - Webhook event: 'charge_successful' (not 'charge.success')
// - Webhook signature header: 'x-squad-encrypted-body' (SHA512, uppercase)

// Sandbox base URL
'base_url' => 'https://sandbox-api-d.squadco.com'
```

## Anti-patterns

- Don't assume Squad field names match Paystack — they differ significantly
- Don't skip the uppercase conversion on Squad webhook signature comparison
- Don't use Squad sandbox keys in production — sandbox URL is different from production
