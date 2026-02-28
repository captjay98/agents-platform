---
globs:
  - "lib/**/*.dart"
alwaysApply: false
---

# Flutter Widget Rules

1. **Always use `const` constructors** — wherever possible to prevent unnecessary rebuilds
2. **Always pass `super.key`** — every custom widget constructor must include `{super.key}`
3. **Never put business logic in widgets** — use Riverpod providers and repositories
4. **Never use `ref.read` in `build()`** — use `ref.watch` to react to state changes
5. **Never use `ref.watch` in callbacks** — use `ref.read` in `onPressed`, `onTap`, etc.
6. **Prefer `ConsumerWidget` over `StatefulWidget`** — when state is managed by Riverpod
7. **Extract widgets when they exceed ~80 lines** — or when they can be reused

```dart
// ✅ Correct
class PostCard extends ConsumerWidget {
  const PostCard({super.key, required this.postId});
  final String postId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final post = ref.watch(postProvider(postId));
    return post.when(
      data: (p) => Card(child: Text(p.title)),
      loading: () => const CardSkeleton(),
      error: (e, _) => const ErrorCard(),
    );
  }
}

// ❌ Wrong — no key, business logic in widget, ref.read in build
class PostCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final post = ref.read(postProvider(postId));  // Won't rebuild on change
    final result = processPost(post);             // Business logic in widget
    return Card(child: Text(result.title));
  }
}
```
