---
trigger: file_edit
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.php']
---

# Prefer Composition

Compose small, focused functions and modules. Avoid deep inheritance hierarchies.

## Enforcement

- Functions should do one thing
- Inject dependencies, don't inherit them
- Use interfaces/types for contracts, not abstract classes
- Prefer hooks/mixins over class inheritance
