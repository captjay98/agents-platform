---
name: reverb-client
description: Laravel Echo + Pusher.js client setup for Reverb WebSockets. Use when connecting a React/TypeScript frontend to Laravel Reverb, subscribing to channels, or listening to broadcast events.
---

# Laravel Reverb — Client (Echo + Pusher.js)

## Installation

```bash
npm install laravel-echo pusher-js
```

## Echo setup — `lib/echo.ts`

```ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window { Pusher: typeof Pusher }
}
window.Pusher = Pusher

export const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  // Auth endpoint for private/presence channels
  authEndpoint: '/broadcasting/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  },
})
```

## `.env` (frontend)

```env
VITE_REVERB_APP_KEY=your-app-key
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

## Subscribing to channels

```ts
// Public channel
echo.channel('announcements')
  .listen('.announcement.created', (data: { message: string }) => {
    console.log(data.message)
  })

// Private channel (requires auth)
echo.private(`orders.${orderId}`)
  .listen('.order.status.updated', (data: { id: number; status: string }) => {
    updateOrderStatus(data)
  })

// Presence channel (auth + member list)
echo.join(`chat.${roomId}`)
  .here((members: Member[]) => setMembers(members))
  .joining((member: Member) => addMember(member))
  .leaving((member: Member) => removeMember(member))
  .listen('.message.sent', (data: Message) => addMessage(data))
```

## React hook

```ts
import { useEffect } from 'react'
import { echo } from '~/lib/echo'

export function useOrderUpdates(orderId: string, onUpdate: (data: any) => void) {
  useEffect(() => {
    const channel = echo.private(`orders.${orderId}`)
    channel.listen('.order.status.updated', onUpdate)

    return () => {
      channel.stopListening('.order.status.updated')
      echo.leave(`orders.${orderId}`)
    }
  }, [orderId, onUpdate])
}
```

## Event name convention

```ts
// Laravel broadcasts as: App\Events\OrderStatusUpdated → 'App\\Events\\OrderStatusUpdated'
// With broadcastAs() → '.order.status.updated' (note leading dot for custom names)
// Without broadcastAs() → listen without dot prefix

echo.private('orders.1').listen('OrderStatusUpdated', handler)       // default name
echo.private('orders.1').listen('.order.status.updated', handler)    // custom broadcastAs
```

## Auth endpoint (Laravel side)

```php
// routes/api.php or routes/web.php
Broadcast::routes(['middleware' => ['auth:sanctum']]);
```

## Cleanup on component unmount

```ts
// Always leave channels to prevent memory leaks
useEffect(() => {
  const channel = echo.private(`orders.${orderId}`)
  channel.listen('.order.status.updated', handler)

  return () => {
    echo.leave(`orders.${orderId}`)  // unsubscribes + disconnects if no other listeners
  }
}, [orderId])
```

## Anti-patterns

- Don't forget the leading dot (`.`) when using `broadcastAs()` custom event names
- Don't leave channels without cleanup — always call `echo.leave()` on unmount
- Don't hardcode auth token — refresh it when it expires
- Don't use `echo.channel()` for user-specific data — use `echo.private()`
