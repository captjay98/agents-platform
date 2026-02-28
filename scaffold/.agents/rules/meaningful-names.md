---
trigger: file_edit
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.php']
---

# Meaningful Names

Names must reveal intent. No abbreviations, no single letters (except loop indices), no generic names.

## Examples

```
// ❌ Bad
const d = getData()
const tmp = process(d)
function handle(x) {}

// ✅ Good
const activeOrders = fetchActiveOrders()
const formattedReport = formatOrderReport(activeOrders)
function validatePaymentAmount(amount) {}
```

<!-- PROJECT: Add naming conventions specific to your domain -->
