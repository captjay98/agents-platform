---
name: firebase-flutter
description: Firebase integration in Flutter — FCM push notifications, Firebase Core setup. Use when setting up Firebase, handling push notifications, or managing notification permissions.
---

# Firebase — Flutter

## pubspec.yaml

```yaml
dependencies:
  firebase_core: ^4.0.0
  firebase_messaging: ^16.0.0
  flutter_local_notifications: ^19.0.0  # for foreground notifications
```

## Initialization — `main.dart`

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Top-level background handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Handle background message
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const MyApp());
}
```

## FCM service

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FcmService {
  final _messaging = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      await _setupLocalNotifications();
      await _setupMessageHandlers();
    }
  }

  Future<String?> getToken() async {
    return _messaging.getToken();
  }

  // Call this when user logs in — send token to backend
  Future<void> registerToken(Future<void> Function(String token) onToken) async {
    final token = await getToken();
    if (token != null) await onToken(token);

    // Handle token refresh
    _messaging.onTokenRefresh.listen(onToken);
  }

  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();

    await _localNotifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create notification channel (Android 8+)
    const channel = AndroidNotificationChannel(
      'high_importance_channel',
      'High Importance Notifications',
      importance: Importance.high,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> _setupMessageHandlers() async {
    // Foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(message);
    });

    // Background → foreground tap
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

    // App opened from terminated state via notification
    final initial = await _messaging.getInitialMessage();
    if (initial != null) _handleMessageTap(initial);
  }

  void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: message.data['route'],
    );
  }

  void _handleMessageTap(RemoteMessage message) {
    final route = message.data['route'];
    if (route != null) {
      // Navigate to route
    }
  }

  void _onNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      // Navigate to payload route
    }
  }
}
```

## Riverpod provider

```dart
@riverpod
FcmService fcmService(ref) => FcmService();

// In app initialization
ref.read(fcmServiceProvider).initialize();
ref.read(fcmServiceProvider).registerToken((token) async {
  await ref.read(authRepositoryProvider).updateFcmToken(token);
});
```

## Android setup — `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<application>
  <!-- FCM default channel -->
  <meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="high_importance_channel" />
</application>
```

## Anti-patterns

- Don't handle background messages in a class method — must be a top-level function
- Don't skip `flutter_local_notifications` — FCM doesn't show foreground notifications by default
- Don't forget to re-register token on login — tokens can change
- Don't navigate directly in background handler — app may not be running
