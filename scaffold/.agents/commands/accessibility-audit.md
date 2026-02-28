---
description: 'WCAG compliance audit for UI components'
---

@frontend-engineer Run an accessibility audit: $ARGUMENTS

## Checklist

1. **Keyboard navigation**: Can every interactive element be reached and activated with keyboard?
2. **Screen reader**: Do all images have alt text? Are form labels associated?
3. **Color contrast**: Does text meet WCAG AA (4.5:1 normal, 3:1 large)?
4. **Focus management**: Is focus visible? Does it follow logical order?
5. **ARIA**: Are ARIA roles and labels used correctly (not excessively)?

```bash
# <!-- PROJECT: Your a11y audit command (e.g., axe, lighthouse) -->
```

## Output

For each issue: element, WCAG criterion violated, severity, fix.
