---
name: resend-setup
description: Transactional email with Resend in TypeScript/Cloudflare Workers. Use when sending emails, building email templates with React Email, or handling email delivery in TanStack Start/Workers.
---

# Resend — TypeScript

## Installation

```bash
npm install resend
# Optional: React Email for templates
npm install @react-email/components react react-dom
```

## Basic setup

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
```

## In Cloudflare Workers / TanStack Start server functions

```ts
// lib/email.ts
import { Resend } from 'resend'
import { getEnvVar } from '~/lib/env'

export async function getResend() {
  const apiKey = await getEnvVar('RESEND_API_KEY')
  return new Resend(apiKey)
}

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html?: string
  react?: React.ReactElement
  from?: string
  replyTo?: string
}) {
  const resend = await getResend()
  const from = params.from ?? 'App Name <noreply@yourdomain.com>'

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    react: params.react,
    reply_to: params.replyTo,
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  return data
}
```

## React Email template

```tsx
// emails/welcome.tsx
import {
  Body, Button, Container, Head, Heading,
  Html, Preview, Section, Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
  loginUrl: string
}

export function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the platform, {name}!</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Heading>Welcome, {name}!</Heading>
          <Text>Your account is ready. Click below to get started.</Text>
          <Section>
            <Button href={loginUrl} style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px' }}>
              Get Started
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

## Sending with React template

```ts
import { WelcomeEmail } from '~/emails/welcome'

await sendEmail({
  to: user.email,
  subject: 'Welcome to the platform',
  react: <WelcomeEmail name={user.name} loginUrl={`${baseUrl}/login`} />,
})
```

## Common email types

```ts
// Password reset
await sendEmail({
  to: user.email,
  subject: 'Reset your password',
  react: <PasswordResetEmail resetUrl={`${baseUrl}/reset?token=${token}`} />,
})

// Transactional notification
await sendEmail({
  to: user.email,
  subject: `Order #${order.id} confirmed`,
  react: <OrderConfirmationEmail order={order} />,
})

// Batch sending
await resend.batch.send([
  { from, to: 'user1@example.com', subject: '...', html: '...' },
  { from, to: 'user2@example.com', subject: '...', html: '...' },
])
```

## Domain setup

```
# DNS records for yourdomain.com
# Add in Resend dashboard → Domains → Add Domain
# Resend provides SPF, DKIM, DMARC records to add to DNS
```

## Error handling

```ts
const { data, error } = await resend.emails.send({ ... })

if (error) {
  // error.name: 'validation_error' | 'missing_required_field' | 'rate_limit_exceeded' etc.
  console.error('Resend error:', error.name, error.message)
  throw new Error(`Failed to send email: ${error.message}`)
}
```

## Anti-patterns

- Don't use `nodemailer` in Cloudflare Workers — it requires Node.js APIs not available in Workers
- Don't send emails synchronously in request handlers for non-critical emails — queue them
- Don't hardcode `from` address — use a constant from env/config
- Don't skip domain verification — emails from unverified domains go to spam
