# Testing

Test suite for agents-platform tooling.

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Test Structure

```
tooling/test/
├── sync.test.mjs       # Sync logic tests
├── build.test.mjs      # Build process tests (TODO)
├── renderers.test.mjs  # Renderer tests (TODO)
└── fixtures/           # Test fixtures (gitignored)
```

## Test Coverage

### Sync Logic (`sync.test.mjs`)
- ✅ Tooling always syncs (overwrites)
- ✅ Scaffold respects skipExisting
- ✅ Stack content syncs based on profile.toml
- ⏳ Shared universal content respects skipExisting
- ⏳ Projects.json validation

### Build Process (`build.test.mjs` - TODO)
- ⏳ Generates valid AGENTS.md
- ⏳ Respects profile.toml toolchains
- ⏳ Includes guide-header
- ⏳ Processes all content types (commands, skills, personas, rules, steering)
- ⏳ Handles missing files gracefully

### Renderers (`renderers.test.mjs` - TODO)
- ⏳ Claude renderer produces valid output
- ⏳ Kiro renderer produces valid output
- ⏳ Gemini renderer produces valid output
- ⏳ OpenCode renderer produces valid output
- ⏳ Factory renderer produces valid output

### Bootstrap (`bootstrap.test.mjs` - TODO)
- ⏳ Creates complete project structure
- ⏳ Doesn't overwrite existing files
- ⏳ Syncs tooling after scaffold

### Validation (`verify.test.mjs` - TODO)
- ⏳ Detects missing required files
- ⏳ Validates profile.toml structure
- ⏳ Checks for broken includes

### Linting (`lint.test.mjs` - TODO)
- ⏳ Detects placeholders in production files
- ⏳ Validates frontmatter
- ⏳ Checks for broken cross-references

## Adding Tests

1. Create test file in `tooling/test/`
2. Use Node.js built-in test runner
3. Use `fixtures/` for test data (gitignored)
4. Clean up fixtures in test teardown

Example:
```javascript
import { test } from 'node:test'
import assert from 'node:assert'

test('my feature works', async () => {
  // Setup
  // Execute
  // Assert
  // Cleanup
})
```

## CI Integration

Tests run on:
- Pre-commit (via git hooks)
- Pre-push (via git hooks)
- CI/CD pipeline (GitHub Actions, etc.)

## Current Status

**Coverage**: ~10% (basic sync tests only)
**Target**: 80% (all critical paths covered)

Next priorities:
1. Build process tests
2. Renderer tests
3. Bootstrap tests
