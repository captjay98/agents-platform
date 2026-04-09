---
name: squadco-typescript
description: Squad (SquadCo) payment integration in TypeScript/Node.js or NestJS. Use when implementing payment initialization, verification, or webhook handling via Squad API.
---

# Squad — TypeScript

## Service

```ts
import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface SquadInitResult {
  checkout_url: string
  transaction_ref: string
}

@Injectable()
export class SquadService {
  private readonly secretKey: string
  private readonly baseUrl: string
  private readonly logger = new Logger(SquadService.name)

  constructor(private config: ConfigService) {
    this.secretKey = this.config.getOrThrow('SQUAD_SECRET_KEY')
    this.baseUrl   = this.config.get('SQUAD_BASE_URL', 'https://api.squadco.com')
  }

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` }
  }

  async initializeTransaction(params: {
    email: string
    amount: number        // in kobo
    reference: string
    callbackUrl?: string
    customerName?: string
    metadata?: Record<string, unknown>
  }): Promise<SquadInitResult> {
    const { data } = await axios.post(
      `${this.baseUrl}/transaction/initiate`,
      {
        email:            params.email,
        amount:           params.amount,
        currency:         'NGN',
        transaction_ref:  params.reference,
        callback_url:     params.callbackUrl,
        customer_name:    params.customerName,
        metadata:         params.metadata,
      },
      { headers: this.headers },
    )

    if (data.status !== 200) {
      throw new Error(`Squad init failed: ${data.message}`)
    }

    return {
      checkout_url:    data.data.checkout_url,
      transaction_ref: data.data.transaction_ref,
    }
  }

  async verifyTransaction(reference: string): Promise<{
    success: boolean
    status: string
    amount: number
  }> {
    const { data } = await axios.get(
      `${this.baseUrl}/transaction/verify/${reference}`,
      { headers: this.headers },
    )

    return {
      success: data.status === 200 && data.data?.transaction_status === 'Success',
      status:  data.data?.transaction_status ?? 'unknown',
      amount:  (data.data?.transaction_amount ?? 0) / 100,
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex')
      .toUpperCase()
    const a = Buffer.from(computed)
    const b = Buffer.from((signature ?? '').toUpperCase())
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }
}
```

## Webhook controller

```ts
@Controller('webhooks')
export class WebhookController {
  constructor(private squad: SquadService) {}

  @Post('squad')
  @HttpCode(200)
  async handleSquad(
    @Headers('x-squad-encrypted-body') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? ''

    if (!this.squad.verifyWebhookSignature(rawBody, signature)) {
      return { status: 'unauthorized' }
    }

    const payload = JSON.parse(rawBody)
    const event   = payload.Event ?? payload.event ?? ''

    if (event === 'charge_successful') {
      const reference = payload.Body?.transaction_ref ?? payload.data?.transaction_ref
      if (reference) {
        const verified = await this.squad.verifyTransaction(reference)
        if (verified.success) {
          // process fulfillment
        }
      }
    }

    return { status: 'ok' }
  }
}
```

## Squad vs Paystack field mapping

```ts
// Squad uses different naming conventions:
// Paystack              → Squad
// 'reference'           → 'transaction_ref'
// 'authorization_url'   → 'checkout_url'
// 'charge.success'      → 'charge_successful'
// x-paystack-signature  → x-squad-encrypted-body
// SHA512 lowercase      → SHA512 uppercase
// status: 'success'     → transaction_status: 'Success'
```

## Amount handling

```ts
const amountKobo = Math.round(amountNGN * 100)  // NGN → kobo
const amountNGN  = squadAmount / 100              // kobo → NGN

// Squad minimum: ₦50 = 5000 kobo
```

## Anti-patterns

- Don't reuse Paystack field names — Squad API differs significantly
- Don't skip uppercase on signature — Squad expects uppercase hex
- Don't trust webhook payload amount — always re-verify via `verifyTransaction`
