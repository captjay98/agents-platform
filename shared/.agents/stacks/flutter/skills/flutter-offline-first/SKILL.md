---
name: flutter-offline-first
description: Offline-first data patterns for Flutter — local caching with Hive/Isar, sync strategies, and connectivity handling.
---

# Flutter Offline-First

Cache-first data access with background sync.

## Setup (CRITICAL)

```yaml
dependencies:
  hive_flutter: ^1.1.0       # Simple key-value + box storage
  connectivity_plus: ^6.0.0  # Network status
  riverpod_annotation: ^2.3.0

dev_dependencies:
  hive_generator: ^2.0.0
```

```dart
// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  Hive.registerAdapter(PostAdapter());
  await Hive.openBox<Post>('posts');
  runApp(const ProviderScope(child: App()));
}
```

## Local Storage Layer (CRITICAL)

```dart
// features/posts/data/post_local_storage.dart
class PostLocalStorage {
  PostLocalStorage(this._box);
  final Box<Post> _box;

  List<Post> getAll() => _box.values.toList();

  Post? getById(String id) => _box.get(id);

  Future<void> saveAll(List<Post> posts) async {
    final map = {for (final p in posts) p.id: p};
    await _box.putAll(map);
  }

  Future<void> save(Post post) => _box.put(post.id, post);

  Future<void> delete(String id) => _box.delete(id);

  Stream<BoxEvent> watch() => _box.watch();
}

@riverpod
PostLocalStorage postLocalStorage(PostLocalStorageRef ref) {
  return PostLocalStorage(Hive.box<Post>('posts'));
}
```

## Cache-First Repository (CRITICAL)

```dart
class PostRepository {
  PostRepository(this._api, this._storage, this._connectivity);
  final PostApi _api;
  final PostLocalStorage _storage;
  final ConnectivityService _connectivity;

  // Return cached immediately, then fetch fresh in background
  Stream<List<Post>> watchPosts() async* {
    // 1. Emit cached data immediately
    yield _storage.getAll();

    // 2. Fetch fresh if online
    if (await _connectivity.isOnline) {
      try {
        final fresh = await _api.getPosts();
        await _storage.saveAll(fresh);
        yield fresh;
      } catch (_) {
        // Silently fail — cached data already emitted
      }
    }

    // 3. Stream local changes
    yield* _storage.watch().map((_) => _storage.getAll());
  }

  Future<Post> getPost(String id) async {
    // Try cache first
    final cached = _storage.getById(id);
    if (cached != null) return cached;

    // Fetch from network
    final post = await _api.getPost(id);
    await _storage.save(post);
    return post;
  }

  Future<Post> createPost(CreatePostInput input) async {
    final post = await _api.createPost(input);
    await _storage.save(post);
    return post;
  }
}
```

## Connectivity Provider (HIGH)

```dart
@riverpod
Stream<List<ConnectivityResult>> connectivity(ConnectivityRef ref) {
  return Connectivity().onConnectivityChanged;
}

@riverpod
class ConnectivityService extends _$ConnectivityService {
  @override
  bool build() {
    ref.listen(connectivityProvider, (_, next) {
      state = next.valueOrNull?.contains(ConnectivityResult.none) == false;
    });
    return true;  // Assume online initially
  }

  Future<bool> get isOnline async {
    final result = await Connectivity().checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }
}

// Show offline banner
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(connectivityServiceProvider);
    if (isOnline) return const SizedBox.shrink();

    return Container(
      color: Colors.orange,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: const Center(
        child: Text('You are offline', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## Optimistic Updates (HIGH)

```dart
@riverpod
class PostList extends _$PostList {
  @override
  Future<List<Post>> build() {
    return ref.watch(postRepositoryProvider).watchPosts().first;
  }

  Future<void> deletePost(String id) async {
    // Optimistically remove from UI
    state = state.whenData(
      (posts) => posts.where((p) => p.id != id).toList(),
    );

    try {
      await ref.read(postRepositoryProvider).deletePost(id);
    } catch (e) {
      // Rollback on failure
      ref.invalidateSelf();
      rethrow;
    }
  }
}
```

## Sync Queue (MEDIUM)

For operations that must succeed even when offline:

```dart
// Queue mutations when offline, replay when back online
class SyncQueue {
  final Box<PendingOperation> _queue = Hive.box('sync_queue');

  Future<void> enqueue(PendingOperation op) => _queue.add(op);

  Future<void> processAll(PostApi api) async {
    for (final op in _queue.values.toList()) {
      try {
        await _execute(op, api);
        await op.delete();
      } catch (e) {
        // Leave in queue for next sync attempt
        break;
      }
    }
  }
}
```

## Rules

- Always emit cached data before network data — never show empty state when cache exists
- Always handle network errors silently when cached data is available
- Use optimistic updates for delete/update — rollback on failure
- Never block UI on network requests — show cached data immediately
