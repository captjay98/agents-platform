---
trigger: file_edit
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.php']
---

# Explicit Error Handling

Every error must be caught, logged with context, and handled. No silent catches.

## Examples

```
// ❌ Bad
try { doThing() } catch (e) {}

// ❌ Bad
try { doThing() } catch (e) { console.log(e) }

// ✅ Good
try {
  doThing()
} catch (error) {
  logger.error({ operation: 'doThing', context, error })
  throw new AppError('THING_FAILED', { cause: error })
}
```

<!-- PROJECT: Add language-specific error patterns for your stack -->
