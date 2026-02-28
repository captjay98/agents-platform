---
name: capacitor-plugins
description: Capacitor native plugins — camera, geolocation, push notifications, storage, network. Use when accessing native device features from a web app via Capacitor.
---

# Capacitor Plugins

## Installation

```bash
npm install @capacitor/camera @capacitor/geolocation @capacitor/push-notifications
npm install @capacitor/preferences @capacitor/network @capacitor/app
npx cap sync
```

## Camera

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

async function takePhoto(): Promise<string | null> {
  const permission = await Camera.requestPermissions()
  if (permission.camera !== 'granted') return null

  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,  // or Base64, Uri
    source: CameraSource.Camera,           // or Photos, Prompt
  })

  return photo.dataUrl ?? null
}

async function pickFromGallery(): Promise<string[]> {
  const images = await Camera.pickImages({
    quality: 80,
    limit: 5,
  })
  return images.photos.map((p) => p.webPath ?? '')
}
```

## Geolocation

```ts
import { Geolocation } from '@capacitor/geolocation'

async function getCurrentPosition() {
  const permission = await Geolocation.requestPermissions()
  if (permission.location !== 'granted') throw new Error('Location denied')

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  })

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
  }
}

// Watch position
const watchId = await Geolocation.watchPosition(
  { enableHighAccuracy: true },
  (position, err) => {
    if (err) return
    updateLocation(position.coords.latitude, position.coords.longitude)
  },
)

// Stop watching
await Geolocation.clearWatch({ id: watchId })
```

## Push Notifications

```ts
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

async function setupPushNotifications(onToken: (token: string) => void) {
  if (!Capacitor.isNativePlatform()) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', ({ value: token }) => {
    onToken(token)
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error)
  })

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Foreground notification
    console.log('Notification received:', notification)
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // User tapped notification
    const route = action.notification.data?.route
    if (route) navigate(route)
  })
}
```

## Preferences (key-value storage)

```ts
import { Preferences } from '@capacitor/preferences'

// Set
await Preferences.set({ key: 'auth_token', value: token })

// Get
const { value } = await Preferences.get({ key: 'auth_token' })

// Remove
await Preferences.remove({ key: 'auth_token' })

// Clear all
await Preferences.clear()
```

## Network status

```ts
import { Network } from '@capacitor/network'

// Get current status
const status = await Network.getStatus()
console.log('Connected:', status.connected, 'Type:', status.connectionType)

// Listen for changes
Network.addListener('networkStatusChange', (status) => {
  if (!status.connected) showOfflineBanner()
  else hideOfflineBanner()
})
```

## App lifecycle

```ts
import { App } from '@capacitor/app'

App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    // App came to foreground — refresh data
  }
})

App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) window.history.back()
  else App.exitApp()
})
```

## Permission handling pattern

```ts
async function requestPermission(plugin: any, permission: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true

  const status = await plugin.checkPermissions()
  if (status[permission] === 'granted') return true

  const result = await plugin.requestPermissions()
  return result[permission] === 'granted'
}
```

## Anti-patterns

- Don't call native plugins on web without `Capacitor.isNativePlatform()` check
- Don't store sensitive data in `Preferences` — it's not encrypted (use `@capacitor/secure-storage` for tokens)
- Don't forget `npx cap sync` after installing new plugins
- Don't request all permissions at startup — request them contextually when needed
