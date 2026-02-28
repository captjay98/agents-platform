---
alwaysApply: true
---

# Payments Rules

1. **Never log payment credentials** — no API keys, webhook secrets, card data, or full account numbers in logs or error messages.
2. **Always verify webhook signatures** — every incoming webhook must be verified against the provider's signature before processing.
3. **Always use idempotency keys** — all payment initiation requests must include an idempotency key to prevent duplicate charges.
4. **Store money in integer minor units only** — kobo for NGN, cents for USD. Never use floats for monetary values.
5. **Never expose provider error messages to end users** — log the full error internally, return a safe generic message to the client.
6. **Always check payment status before fulfilling** — never fulfill an order based on a webhook alone without verifying status via the provider API.
7. **Never hardcode payment amounts** — amounts must come from server-side order records, never from client input.
