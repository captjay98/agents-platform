---
name: paystack-laravel
description: Paystack payment integration in Laravel. Use when implementing payment initialization, verification, webhooks, refunds, or split payments via Paystack API.
---

# Paystack — Laravel

## Config — `config/services.php`

```php
'paystack' => [
    'secret_key' => env('PAYSTACK_SECRET_KEY'),
    'public_key' => env('PAYSTACK_PUBLIC_KEY'),
    'base_url'   => env('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
    'webhook_secret' => env('PAYSTACK_WEBHOOK_SECRET'),
],
```

## Gateway implementation

```php
class PaystackGateway implements PaymentGatewayInterface
{
    private string $secretKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.paystack.secret_key');
        $this->baseUrl   = config('services.paystack.base_url', 'https://api.paystack.co');
    }

    public function initializePayment(float $amount, array $metadata): array
    {
        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/transaction/initialize", [
                'email'        => $metadata['email'],
                'amount'       => (int) round($amount * 100), // kobo
                'currency'     => $metadata['currency'] ?? 'NGN',
                'reference'    => $metadata['reference'],
                'callback_url' => $metadata['callback_url'] ?? null,
                'metadata'     => [
                    'custom_fields' => [
                        ['display_name' => 'Order ID',   'variable_name' => 'order_id',   'value' => $metadata['order_id'] ?? null],
                        ['display_name' => 'User ID',    'variable_name' => 'user_id',    'value' => $metadata['user_id'] ?? null],
                    ],
                ],
            ]);

        $data = $response->json();

        if (! $response->successful() || ! ($data['status'] ?? false)) {
            throw new PaymentException("Paystack init failed: " . ($data['message'] ?? 'Unknown'));
        }

        return [
            'authorization_url' => $data['data']['authorization_url'],
            'access_code'       => $data['data']['access_code'],
            'reference'         => $data['data']['reference'],
        ];
    }

    public function verifyPayment(string $reference): bool
    {
        $response = Http::withToken($this->secretKey)
            ->get("{$this->baseUrl}/transaction/verify/{$reference}");

        $data = $response->json();

        return $response->successful()
            && ($data['status'] ?? false)
            && ($data['data']['status'] ?? '') === 'success';
    }

    public function processRefund(string $reference, float $amount): bool
    {
        $response = Http::withToken($this->secretKey)
            ->post("{$this->baseUrl}/refund", [
                'transaction' => $reference,
                'amount'      => (int) round($amount * 100),
            ]);

        return $response->successful() && ($response->json('status') ?? false);
    }
}
```

## Webhook handler

```php
class PaystackWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        // 1. Verify signature
        $signature = $request->header('x-paystack-signature');
        $computed  = hash_hmac('sha512', $request->getContent(), config('services.paystack.secret_key'));

        if (! hash_equals($computed, $signature ?? '')) {
            return response('Unauthorized', 401);
        }

        $payload = $request->json()->all();
        $event   = $payload['event'] ?? '';
        $data    = $payload['data'] ?? [];

        match ($event) {
            'charge.success'     => $this->handleChargeSuccess($data),
            'transfer.success'   => $this->handleTransferSuccess($data),
            'transfer.failed'    => $this->handleTransferFailed($data),
            'refund.processed'   => $this->handleRefundProcessed($data),
            default              => null,
        };

        return response('OK', 200);
    }

    private function handleChargeSuccess(array $data): void
    {
        $reference = $data['reference'];

        // Idempotency — check if already processed
        if (Payment::where('reference', $reference)->where('status', 'paid')->exists()) {
            return;
        }

        DB::transaction(function () use ($data, $reference) {
            $payment = Payment::where('reference', $reference)->lockForUpdate()->firstOrFail();
            $payment->update(['status' => 'paid', 'paid_at' => now()]);
            // dispatch fulfillment job
            ProcessPaymentFulfillment::dispatch($payment);
        });
    }
}
```

## Webhook route (exclude from CSRF)

```php
// bootstrap/app.php or Kernel.php
$middleware->validateCsrfTokens(except: ['webhooks/paystack']);

// routes/web.php
Route::post('/webhooks/paystack', [PaystackWebhookController::class, 'handle']);
```

## Subaccounts (split payments)

```php
// Create subaccount
Http::withToken($secretKey)->post('/subaccount', [
    'business_name'       => 'Vendor Name',
    'settlement_bank'     => '058',  // bank code
    'account_number'      => '0123456789',
    'percentage_charge'   => 20,     // platform takes 20%
]);

// Initialize with split
$payload['subaccount'] = $subaccountCode;
$payload['bearer']     = 'account'; // subaccount bears Paystack fees
```

## Transfer (payout)

```php
// Create transfer recipient
$recipient = Http::withToken($secretKey)->post('/transferrecipient', [
    'type'           => 'nuban',
    'name'           => $user->name,
    'account_number' => $bankAccount->account_number,
    'bank_code'      => $bankAccount->bank_code,
    'currency'       => 'NGN',
])->json('data.recipient_code');

// Initiate transfer
Http::withToken($secretKey)->post('/transfer', [
    'source'    => 'balance',
    'amount'    => (int) round($amount * 100),
    'recipient' => $recipient,
    'reason'    => 'Vendor payout',
    'reference' => Str::uuid(),
]);
```

## Anti-patterns

- Never verify payment only on callback URL — always verify via webhook `charge.success`
- Don't skip idempotency check in webhook handler — Paystack may retry
- Don't store secret key in frontend — only public key goes to client
