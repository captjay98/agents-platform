---
name: flutter-conventions
description: Cross-project Flutter conventions — feature-first structure, Riverpod code-gen, Dio networking, GoRouter navigation, Freezed models, and Firebase integration. Use when building mobile features in Projavi or DeliveryNexus.
---

# Flutter Conventions

Shared patterns across Projavi and DeliveryNexus mobile apps.

## Directory Layout (CRITICAL)

```
lib/
├── main.dart                    # Entry point: Firebase init, runApp
├── app/
│   ├── app.dart                 # Root widget (ProviderScope → MaterialApp.router)
│   ├── router/                  # GoRouter config + route guards
│   ├── theme/                   # ThemeData, colors, text styles
│   ├── constants/               # App-wide constants
│   └── providers/               # App-level Riverpod providers
├── core/
│   ├── network/
│   │   ├── dio_client.dart      # Dio singleton (@Riverpod keepAlive)
│   │   ├── api_client.dart      # Typed API wrapper
│   │   └── interceptors/        # Auth, error, tenant, retry
│   ├── storage/                 # Secure storage, preferences
│   ├── database/                # Drift/SQLite (offline-first)
│   ├── errors/                  # AppException hierarchy
│   ├── platform/                # Device, permissions, location
│   └── utils/                   # Pure utility functions
├── features/
│   └── [domain]/
│       ├── presentation/        # Widgets, pages, screens
│       ├── providers/           # Feature-scoped Riverpod providers
│       └── models/              # Freezed data models
├── shared/
│   ├── presentation/            # Shared widgets, layout components
│   ├── providers/               # Cross-feature providers
│   └── utils/                   # Shared utilities
└── routing/                     # Route definitions (alternative to app/router/)
```

## State Management — Riverpod (CRITICAL)

Code-gen with `@riverpod` annotation. `keepAlive: true` for singletons:

```dart
// Singleton provider (Dio, router, auth)
@Riverpod(keepAlive: true)
Dio dioClient(Ref ref) {
  final dio = Dio(BaseOptions(
    baseUrl: dotenv.env['API_BASE_URL']!,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ));
  dio.interceptors.addAll([
    AuthInterceptor(ref),
    ErrorInterceptor(),
    if (kDebugMode) PrettyDioLogger(),
  ]);
  return dio;
}

// Auto-dispose provider (feature-scoped)
@riverpod
Future<List<Order>> orders(Ref ref) async {
  final client = ref.watch(apiClientProvider);
  return client.getOrders();
}
```

## Models — Freezed (CRITICAL)

All data models use Freezed + json_serializable:

```dart
@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    String? avatarUrl,
    required UserRole role,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

Run `dart run build_runner build` after model changes.

## Navigation — GoRouter (CRITICAL)

GoRouter via Riverpod with auth guard:

```dart
@Riverpod(keepAlive: true)
GoRouter router(Ref ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isAuthenticated && !isAuthRoute) return '/auth/login';
      if (isAuthenticated && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          // ... domain routes
        ],
      ),
    ],
  );
}
```

Route names as constants:

```dart
abstract class RouteNames {
  static const home = '/home';
  static const login = '/auth/login';
  static const profile = '/profile';
}
```

## Networking — Dio (HIGH)

Interceptor chain: auth → tenant → error → retry → logging:

```dart
class AuthInterceptor extends Interceptor {
  final Ref ref;
  AuthInterceptor(this.ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await ref.read(secureStorageProvider).read(key: 'auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
```

Typed API client wrapping Dio:

```dart
class ApiClient {
  final Dio _dio;
  ApiClient(this._dio);

  Future<ApiResponse<T>> get<T>(String path, {T Function(dynamic)? fromJson}) async {
    final response = await _dio.get(path);
    return ApiResponse.fromJson(response.data, fromJson);
  }
}
```

Domain services as separate providers:

```dart
@riverpod
AuthService authService(Ref ref) => AuthService(ref.watch(apiClientProvider));

class AuthService {
  final ApiClient _client;
  AuthService(this._client);

  Future<User> login(String email, String password) =>
    _client.post('/auth/login', data: {'email': email, 'password': password});
}
```

## Auth Flow (HIGH)

Auth Notifier with explicit states:

```dart
@Riverpod(keepAlive: true)
class Auth extends _$Auth {
  @override
  AuthState build() => const AuthState.loading();

  Future<void> checkAuth() async {
    try {
      final token = await ref.read(secureStorageProvider).read(key: 'auth_token');
      if (token == null) { state = const AuthState.unauthenticated(); return; }
      final user = await ref.read(authServiceProvider).me();
      state = AuthState.authenticated(user);
    } catch (_) {
      state = const AuthState.unauthenticated();
    }
  }
}

@freezed
class AuthState with _$AuthState {
  const factory AuthState.loading() = _Loading;
  const factory AuthState.authenticated(User user) = _Authenticated;
  const factory AuthState.unauthenticated() = _Unauthenticated;
}
```

## Firebase (MEDIUM)

Initialize in `main()` before `runApp()`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: App()));
}
```

FCM for push + `flutter_local_notifications` for foreground display.

## Connectivity (MEDIUM)

Stream-based with DNS lookup for real reachability:

```dart
@riverpod
Stream<bool> isConnected(Ref ref) {
  return Connectivity().onConnectivityChanged.asyncMap((result) async {
    if (result.contains(ConnectivityResult.none)) return false;
    try {
      final lookup = await InternetAddress.lookup('example.com');
      return lookup.isNotEmpty;
    } catch (_) { return false; }
  });
}
```

## Rules

- Feature modules: `features/{name}/{presentation, providers, models}`
- All providers use `@riverpod` code-gen, `keepAlive: true` for singletons
- All models use Freezed + json_serializable
- GoRouter for navigation, auth guard reads Riverpod auth state
- Dio singleton with interceptor chain, domain services as separate providers
- `flutter_secure_storage` for tokens, never SharedPreferences
- `flutter_screenutil` for responsive sizing (375×812 design)
- Run `dart run build_runner build` after model/provider changes
- Portrait-locked for phone-first UX
