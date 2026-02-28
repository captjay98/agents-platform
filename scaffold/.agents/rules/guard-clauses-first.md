---
trigger: file_edit
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.php']
---

# Guard Clauses First

Handle invalid/edge cases at the top of functions. Return early. Keep the happy path unindented.

## Examples

```
// ❌ Bad — deeply nested
function process(input) {
  if (input) {
    if (input.isValid) {
      // 3 levels deep...
    }
  }
}

// ✅ Good — guard clauses
function process(input) {
  if (!input) return null
  if (!input.isValid) throw new Error('Invalid input')

  // happy path at top level
}
```

<!-- PROJECT: Add language-specific guard clause patterns -->
