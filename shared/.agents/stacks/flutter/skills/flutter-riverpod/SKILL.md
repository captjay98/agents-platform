---
name: flutter-riverpod
description: State management with Riverpod 2.x — providers, async state, notifiers, and dependency injection. Use when managing state in Flutter apps.
---

# Flutter Riverpod

Riverpod 2.x with code generation (`riverpod_annotation`).

## Setup (CRITICAL)

```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0

dev_dependencies:
  riverpod_generator: ^2.4.0
  build_runner: ^2.4.0
```

```dart
// main.dart
void main() {
  runApp(const ProviderScope(child: App()));
}
```

## Provider Types (CRITICAL)

```dart
// Simple computed value
@riverpod
String greeting(GreetingRef ref) => 'Hello, World!';

// Async data (Future)
@riverpod
Future<List<Post>> posts(PostsRef ref) {
  return ref.watch(postRepositoryProvider).getPosts();
}

// Stream
@riverpod
Stream<User?> authState(AuthStateRef ref) {
  return ref.watch(authServiceProvider).userStream;
}

// Mutable state — use Notifier
@riverpod
class Counter extends _$Counter {
  @override
  int build() => 0;

  void increment() => state++;
  void reset() => state = 0;
}

// Async mutable state — use AsyncNotifier
@riverpod
class PostList extends _$PostList {
  @override
  Future<List<Post>> build() {
    return ref.watch(postRepositoryProvider).getPosts();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(postRepositoryProvider).getPosts());
  }

  Future<void> create(CreatePostInput input) async {
    final post = await ref.read(postRepositoryProvider).createPost(input);
    state = state.whenData((posts) => [post, ...posts]);
  }
}
```

## Consuming Providers (HIGH)

```dart
// ConsumerWidget — for widgets that read providers
class PostsScreen extends ConsumerWidget {
  const PostsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(postsProvider);

    return postsAsync.when(
      data: (posts) => PostList(posts: posts),
      loading: () => const PostListSkeleton(),
      error: (error, stack) => ErrorView(message: error.toString()),
    );
  }
}

// ConsumerStatefulWidget — when you need lifecycle methods
class PostFormScreen extends ConsumerStatefulWidget {
  const PostFormScreen({super.key});

  @override
  ConsumerState<PostFormScreen> createState() => _PostFormScreenState();
}

class _PostFormScreenState extends ConsumerState<PostFormScreen> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(postListProvider).isLoading;
    return Form(key: _formKey, child: /* ... */);
  }
}
```

## Dependency Injection (HIGH)

```dart
// Providers depend on other providers
@riverpod
Dio dio(DioRef ref) {
  final dio = Dio(BaseOptions(baseUrl: AppConfig.apiUrl));
  dio.interceptors.add(AuthInterceptor(ref));
  return dio;
}

@riverpod
PostApi postApi(PostApiRef ref) {
  return PostApi(ref.watch(dioProvider));
}

@riverpod
PostRepository postRepository(PostRepositoryRef ref) {
  return PostRepository(
    ref.watch(postApiProvider),
    ref.watch(postLocalStorageProvider),
  );
}
```

## Family Providers (HIGH)

```dart
// Parameterized providers
@riverpod
Future<Post> post(PostRef ref, String postId) {
  return ref.watch(postRepositoryProvider).getPost(postId);
}

// Usage
final post = ref.watch(postProvider('post-123'));
```

## Invalidation and Refresh (MEDIUM)

```dart
// Invalidate to force refetch
ref.invalidate(postsProvider);

// Invalidate specific family instance
ref.invalidate(postProvider('post-123'));

// Read without watching (in callbacks)
Future<void> onSubmit() async {
  await ref.read(postListProvider.notifier).create(input);
  ref.invalidate(postsProvider);
}
```

## Listening for Side Effects (MEDIUM)

```dart
@override
Widget build(BuildContext context, WidgetRef ref) {
  // Listen for state changes (navigation, toasts)
  ref.listen(postListProvider, (previous, next) {
    next.whenOrNull(
      error: (error, _) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      ),
    );
  });

  return /* ... */;
}
```

## Rules

- Always use code generation (`@riverpod`) — never manual `Provider()` constructors
- Always use `ref.watch` in `build()`, `ref.read` in callbacks/event handlers
- Never call `ref.watch` inside conditionals or loops
- Use `AsyncNotifier` for async mutable state — never `StateNotifier<AsyncValue<T>>`
- Prefer `ConsumerWidget` over `Consumer` widget for cleaner code
