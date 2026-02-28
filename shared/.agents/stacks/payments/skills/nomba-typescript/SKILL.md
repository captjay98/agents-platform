---
name: nomba-typescript
description: Nomba payment integration in TypeScript/Cloudflare Workers. Use when creating checkout URLs, verifying payments, or handling Nomba webhooks with HMAC signature verification.
---

# Nomba — TypeScript

## Checkout URL creation

```ts
export async function createNombaCheckoutUrl(params: {
  amount: number        // in kobo
  currency?: string
  reference: string
  callbackUrl?: string
  email?: string
  metadata?: Record<string, unknown>
}): Promise<{ checkoutUrl: string; reference: string }> {
  const url = new URL('https://checkout.nomba.com/pay')
  url.searchParams.set('amount', String(params.amount))
  url.searchParams.set('currency', params.currency ?? 'NGN')
  url.searchParams.set('reference', params.reference)
  if (params.callbackUrl) url.searchParams.set('callback_url', params.callbackUrl)
  if (params.email) url.searchParams.set('email', params.email)
  if (params.metadata) url.searchParams.set('metadata', JSON.stringify(params.metadata))

  return { checkoutUrl: url.toString(), reference: params.reference }
}
```

## Webhook signature verification (Web Crypto — works in Workers)

```ts
function stableStringify(input: unknown): string {
  if (input === null || typeof input !== 'object') return JSON.stringify(input)
  if (Array.isArray(input)) return `[${input.map(stableStringify).join(',')}]`
  const keys = Object.keys(input as object).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((input as any)[k])}`).join(',')}}`
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyNombaSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const computed = await hmacSha256Hex(secret, rawBody)
  return timingSafeEqual(computed, signature)
}
```

## Webhook handler

```ts
type NombaEvent = {
  id?: string
  eventId?: string
  type?: string
  event?: string
  createdAt?: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function processNombaWebhook(
  request: Request,
  webhookSecret: string,
  onSuccess: (event: NombaEvent) => Promise<void>,
): Promise<Response> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-nomba-signature') ?? ''

  if (!(await verifyNombaSignature(rawBody, signature, webhookSecret))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event: NombaEvent = JSON.parse(rawBody)
  const eventType = event.type ?? event.event ?? ''
  const isPaidEvent = ['payment.successful', 'charge.success', 'transaction.successful'].includes(eventType)

  if (isPaidEvent) {
    await onSuccess(event)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
```

## Idempotency pattern

```ts
// Always lock on providerEventId to prevent double-processing
const providerEventId = event.id ?? event.eventId ?? event.data?.reference as string

// In DB transaction:
// 1. INSERT billing_event with providerEventId (unique constraint)
// 2. If duplicate key → already processed, return 200
// 3. Process fulfillment
// 4. UPDATE billing_event status = 'processed'
```

## Metadata conventions

```ts
// Pass structured metadata through checkout URL
const metadata = {
  purpose: 'subscription' | 'ai_topup' | 'message_topup' | 'marketplace_promotion',
  userId: string,
  // purpose-specific fields:
  planId?: string,
  creditsGranted?: number,
  messagesGranted?: number,
  listingId?: string,
}
```

## Environment variables

```env
NOMBA_WEBHOOK_SECRET=your_webhook_secret
NOMBA_ACCOUNT_ID=your_account_id   # if using API (not just checkout)
```

## Anti-patterns

- Don't use `crypto.createHmac` (Node.js) in Workers — use `crypto.subtle` (Web Crypto API)
- Don't use `===` for signature comparison — use timing-safe comparison to prevent timing attacks
- Don't trust `event.data.amount` — verify payment status independently if using Nomba API
- Don't skip stable JSON stringify for signature body — key order matters for HMAC
