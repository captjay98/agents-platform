---
name: flutter-networking
description: HTTP networking with Dio — interceptors, authentication, error handling, and request/response patterns for Flutter apps.
---


> This skill provides deep-dive patterns. For cross-project conventions and setup, see flutter-conventions.
# Flutter Networking

Dio-based HTTP client with interceptors, auth, and typed error handling.

## Setup (CRITICAL)

```yaml
dependencies:
  dio: ^5.4.0
  pretty_dio_logger: ^1.3.0  # Dev only
```

```dart
// core/network/dio_client.dart
@riverpod
Dio dio(DioRef ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  ));

  dio.interceptors.addAll([
    AuthInterceptor(ref),
    ErrorInterceptor(),
    if (kDebugMode) PrettyDioLogger(requestBody: true, responseBody: true),
  ]);

  return dio;
}
```

## Auth Interceptor (CRITICAL)

```dart
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._ref);
  final Ref _ref;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _ref.read(authTokenProvider);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired — try refresh
      try {
        final newToken = await _ref.read(authServiceProvider).refreshToken();
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final response = await _ref.read(dioProvider).fetch(err.requestOptions);
        handler.resolve(response);
        return;
      } catch (_) {
        // Refresh failed — logout
        _ref.read(authServiceProvider).logout();
      }
    }
    handler.next(err);
  }
}
```

## Error Interceptor (HIGH)

```dart
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final failure = switch (err.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout => const NetworkFailure('Request timed out.'),
      DioExceptionType.connectionError => const NetworkFailure(),
      DioExceptionType.badResponse => _handleStatusCode(err.response!),
      _ => NetworkFailure(err.message ?? 'Unknown error'),
    };

    handler.reject(DioException(
      requestOptions: err.requestOptions,
      error: failure,
      type: err.type,
      response: err.response,
    ));
  }

  Failure _handleStatusCode(Response response) => switch (response.statusCode) {
    401 => const AuthFailure('Unauthorized.'),
    403 => const AuthFailure('Forbidden.'),
    404 => const NotFoundFailure(),
    422 => ValidationFailure(response.data['errors'] ?? {}),
    >= 500 => const ServerFailure(),
    _ => ServerFailure(response.statusCode ?? 0),
  };
}
```

## API Classes (HIGH)

```dart
// features/posts/data/post_api.dart
class PostApi {
  PostApi(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<Post>> getPosts({
    int page = 1,
    int perPage = 15,
    String? search,
  }) async {
    final response = await _dio.get('/posts', queryParameters: {
      'page': page,
      'per_page': perPage,
      if (search != null) 'q': search,
    });
    return PaginatedResponse.fromJson(response.data, Post.fromJson);
  }

  Future<Post> getPost(String id) async {
    final response = await _dio.get('/posts/$id');
    return Post.fromJson(response.data['data']);
  }

  Future<Post> createPost(CreatePostInput input) async {
    final response = await _dio.post('/posts', data: input.toJson());
    return Post.fromJson(response.data['data']);
  }

  Future<Post> updatePost(String id, UpdatePostInput input) async {
    final response = await _dio.patch('/posts/$id', data: input.toJson());
    return Post.fromJson(response.data['data']);
  }

  Future<void> deletePost(String id) async {
    await _dio.delete('/posts/$id');
  }
}
```

## File Uploads (MEDIUM)

```dart
Future<String> uploadAvatar(File file) async {
  final formData = FormData.fromMap({
    'avatar': await MultipartFile.fromFile(
      file.path,
      filename: 'avatar.jpg',
      contentType: DioMediaType('image', 'jpeg'),
    ),
  });

  final response = await _dio.post(
    '/profile/avatar',
    data: formData,
    onSendProgress: (sent, total) {
      final progress = sent / total;
      // Update upload progress state
    },
  );

  return response.data['url'];
}
```

## Pagination Model (MEDIUM)

```dart
@freezed
class PaginatedResponse<T> with _$PaginatedResponse<T> {
  const factory PaginatedResponse({
    required List<T> data,
    required int total,
    required int perPage,
    required int currentPage,
    required int lastPage,
    String? nextPageUrl,
  }) = _PaginatedResponse<T>;

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    return PaginatedResponse(
      data: (json['data'] as List).map((e) => fromJson(e)).toList(),
      total: json['meta']['total'],
      perPage: json['meta']['per_page'],
      currentPage: json['meta']['current_page'],
      lastPage: json['meta']['last_page'],
      nextPageUrl: json['links']['next'],
    );
  }
}
```

## Rules

- Always set `connectTimeout` and `receiveTimeout` — never leave them unlimited
- Always handle 401 with token refresh before logging out
- Never catch `DioException` in UI — let the error interceptor convert to typed `Failure`
- Always use `FormData` for file uploads — never encode files as base64 in JSON
