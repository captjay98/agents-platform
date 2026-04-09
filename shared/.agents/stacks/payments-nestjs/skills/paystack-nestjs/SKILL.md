---
name: paystack-nestjs
description: Paystack payment integration in NestJS. Use when implementing payment initialization, verification, or webhook handling via Paystack API in a NestJS backend.
---

# Paystack — NestJS

## Service

```ts
import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface PaystackInitResult {
  authorization_url: string
  access_code: string
  reference: string
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string
  private readonly baseUrl = 'https://api.paystack.co'
  private readonly logger = new Logger(PaystackService.name)

  constructor(private config: ConfigService) {
    this.secretKey = this.config.getOrThrow('PAYSTACK_SK')
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  async initializeTransaction(params: {
    email: string
    amount: number        // in kobo (multiply NGN by 100)
    reference: string
    callbackUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<PaystackInitResult> {
    const { data } = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      {
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      },
      { headers: this.headers },
    )

    if (!data.status) {
      throw new Error(`Paystack init failed: ${data.message}`)
    }

    return {
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    }
  }

  async verifyTransaction(reference: string): Promise<{
    status: string
    amount: number
    currency: string
    metadata: Record<string, unknown>
  }> {
    const { data } = await axios.get(
      `${this.baseUrl}/transaction/verify/${reference}`,
      { headers: this.headers },
    )

    if (!data.status) {
      throw new Error(`Paystack verify failed: ${data.message}`)
    }

    return {
      status: data.data.status,           // 'success' | 'failed' | 'abandoned'
      amount: data.data.amount / 100,     // convert kobo → NGN
      currency: data.data.currency,
      metadata: data.data.metadata ?? {},
    }
  }

  async refund(transactionReference: string, amount?: number): Promise<boolean> {
    const payload: Record<string, unknown> = { transaction: transactionReference }
    if (amount) payload.amount = Math.round(amount * 100)

    const { data } = await axios.post(`${this.baseUrl}/refund`, payload, {
      headers: this.headers,
    })

    return data.status === true
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex')
    return hash === signature
  }
}
```

## Webhook controller

```ts
import { Controller, Post, Headers, Req, RawBodyRequest, HttpCode } from '@nestjs/common'
import { Request } from 'express'

@Controller('webhooks')
export class WebhookController {
  constructor(private paystack: PaystackService) {}

  @Post('paystack')
  @HttpCode(200)
  async handlePaystack(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? ''

    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      return { status: 'unauthorized' }
    }

    const { event, data } = JSON.parse(rawBody)

    switch (event) {
      case 'charge.success':
        await this.handleChargeSuccess(data)
        break
      case 'transfer.success':
        await this.handleTransferSuccess(data)
        break
    }

    return { status: 'ok' }
  }

  private async handleChargeSuccess(data: any) {
    const { reference, amount, metadata } = data
    // verify + fulfill — always re-verify, don't trust webhook data alone
    const verified = await this.paystack.verifyTransaction(reference)
    if (verified.status !== 'success') return
    // process order/subscription...
  }
}
```

## Enable raw body parsing (main.ts)

```ts
// main.ts — required for webhook signature verification
const app = await NestFactory.create(AppModule, { rawBody: true })
```

## Module setup

```ts
@Module({
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentsModule {}
```

## Amount handling

```ts
// Always work in kobo internally, convert at boundaries
const amountKobo = Math.round(amountNGN * 100)   // NGN → kobo
const amountNGN  = paystackAmount / 100            // kobo → NGN

// Minimum charge: ₦50 = 5000 kobo
// Paystack fee: 1.5% + ₦100 (capped at ₦2000, waived under ₦2500)
```

## Anti-patterns

- Don't trust webhook payload alone — always call `verifyTransaction` to confirm status
- Don't skip `rawBody: true` — signature verification requires the raw request body
- Don't use `amount` from webhook directly — re-verify to get authoritative amount
