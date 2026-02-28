---
name: capacitor-setup
description: Capacitor setup for deploying a web app (React/Next.js/Vite) as a native iOS/Android app. Use when initializing Capacitor, configuring platforms, or setting up the build pipeline.
---

# Capacitor Setup

## Installation

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

## `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yourcompany.appname',
  appName: 'App Name',
  webDir: 'dist',           // or 'out', '.next/standalone', etc.
  server: {
    // For local dev — point to dev server
    // url: 'http://192.168.1.x:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
```

## Build and sync workflow

```bash
# 1. Build web app
npm run build

# 2. Sync web assets to native projects
npx cap sync

# 3. Open in Xcode / Android Studio
npx cap open ios
npx cap open android

# Or run directly
npx cap run ios
npx cap run android
```

## `package.json` scripts

```json
{
  "scripts": {
    "build:mobile": "npm run build && npx cap sync",
    "ios": "npm run build:mobile && npx cap open ios",
    "android": "npm run build:mobile && npx cap open android"
  }
}
```

## Android — `android/app/src/main/AndroidManifest.xml`

```xml
<!-- Required permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- For camera, location, etc. — add as needed -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## iOS — `ios/App/App/Info.plist`

```xml
<!-- Add usage descriptions for permissions -->
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location to show nearby items.</string>
```

## Environment detection

```ts
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()
const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// Conditional behavior
if (Capacitor.isNativePlatform()) {
  // Use native APIs
} else {
  // Use web APIs
}
```

## Live reload during development

```ts
// capacitor.config.ts — for dev only
server: {
  url: 'http://192.168.1.100:3000',  // your machine's local IP
  cleartext: true,
}
```

## Anti-patterns

- Don't commit `ios/` and `android/` directories if using CI — regenerate with `cap add`
- Don't use `localhost` in server URL for device testing — use your machine's local IP
- Don't skip `cap sync` after web build — native projects won't have latest assets
- Don't hardcode `webDir` — match it to your framework's output directory
