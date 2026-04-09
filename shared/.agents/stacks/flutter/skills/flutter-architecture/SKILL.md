---
name: flutter-architecture
description: Feature-first project structure, widget decomposition, and separation of concerns for Flutter apps. Use when starting a new feature or organizing code.
---


> This skill provides deep-dive patterns. For cross-project conventions and setup, see flutter-conventions.
# Flutter Architecture

## Project Structure (CRITICAL)

Feature-first organization — group by feature, not by type:

```
lib/
├── main.dart
├── app/
│   ├── app.dart              # MaterialApp / root widget
│   ├── router.dart           # GoRouter configuration
│   └── theme.dart            # ThemeData
├── core/
│   ├── network/              # Dio client, interceptors
│   ├── storage/              # Hive / SharedPreferences
│   ├── error/                # Failure types, error handling
│   └── utils/                # Extensions, helpers
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── auth_repository.dart
│   │   │   └── auth_api.dart
│   │   ├── domain/
│   │   │   └── auth_state.dart   # Riverpod providers
│   │   └── presentation/
│   │       ├── login_screen.dart
│   │       └── widgets/
│   └── posts/
│       ├── data/
│       ├── domain/
│       └── presentation/
└── shared/
    ├── widgets/              # Reusable UI components
    └── models/               # Shared data models
```

## Widget Decomposition (CRITICAL)

Break large widgets into small, focused pieces:

```dart
// ❌ One massive widget
class PostScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(/* 20 lines */),
      body: Column(children: [
        // 100 lines of nested widgets
      ]),
    );
  }
}

// ✅ Composed from small widgets
class PostScreen extends StatelessWidget {
  const PostScreen({super.key, required this.postId});
  final String postId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PostAppBar(postId: postId),
      body: PostBody(postId: postId),
      floatingActionButton: const PostFab(),
    );
  }
}
```

## Separation of Concerns (HIGH)

```dart
// Data layer — API calls only
class PostApi {
  final Dio _dio;
  PostApi(this._dio);

  Future<List<Post>> getPosts({int page = 1}) async {
    final response = await _dio.get('/posts', queryParameters: {'page': page});
    return (response.data['data'] as List).map(Post.fromJson).toList();
  }
}

// Repository — combines data sources, handles errors
class PostRepository {
  final PostApi _api;
  final PostLocalStorage _storage;

  PostRepository(this._api, this._storage);

  Future<List<Post>> getPosts() async {
    try {
      final posts = await _api.getPosts();
      await _storage.cachePosts(posts);
      return posts;
    } catch (e) {
      // Fallback to cache on network error
      return _storage.getCachedPosts();
    }
  }
}

// Provider — state management (see flutter-riverpod skill)
@riverpod
Future<List<Post>> posts(PostsRef ref) {
  return ref.watch(postRepositoryProvider).getPosts();
}
```

## Model Classes (HIGH)

```dart
// Use freezed for immutable models with copyWith, equality, and JSON
@freezed
class Post with _$Post {
  const factory Post({
    required String id,
    required String title,
    required String content,
    required String authorId,
    @Default(PostStatus.draft) PostStatus status,
    DateTime? publishedAt,
  }) = _Post;

  factory Post.fromJson(Map<String, dynamic> json) => _$PostFromJson(json);
}

enum PostStatus { draft, published, archived }
```

## Error Handling (HIGH)

```dart
// Typed failures instead of raw exceptions
sealed class Failure {
  const Failure(this.message);
  final String message;
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Network error. Check your connection.']);
}

class ServerFailure extends Failure {
  const ServerFailure(this.statusCode, [super.message = 'Server error.']);
  final int statusCode;
}

class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Resource not found.']);
}

// Use Result type (package:result_dart or manual)
typedef Result<T> = ({T? data, Failure? failure});
```

## Rules

- Feature-first structure — never organize by type (screens/, models/, services/)
- Widgets should do one thing — extract when a widget exceeds ~80 lines
- Never put business logic in widgets — use providers/repositories
- Always use `const` constructors where possible
- Always use `super.key` in widget constructors
