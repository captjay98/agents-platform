---
name: ui-audit
description: UI/UX audit checklist for accessibility, responsiveness, and production readiness. Use before release reviews or design cleanups.
---

# UI Audit

Concrete checklist for finding issues users will hit. Not abstract design commentary.

## Accessibility (CRITICAL)

- Keyboard navigation works for all interactive elements
- Visible focus indicators on all focusable elements
- Semantic HTML controls (`button`, `a`, `input`) — not `div` with `onClick`
- ARIA labels on icon-only buttons and non-text controls
- Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- Touch targets ≥ 44×44px for mobile
- Form errors announced to screen readers

## Responsiveness (HIGH)

- Layout works at 320px, 375px, 768px, 1024px, 1440px
- No horizontal scroll at any breakpoint
- Text remains readable without zooming on mobile
- Images and media scale without overflow
- Navigation adapts (hamburger/bottom nav on mobile, sidebar on desktop)

## Money Display (HIGH)

- Amounts formatted with correct currency symbol and locale
- Minor units converted correctly (no off-by-one from float math)
- Negative amounts displayed clearly (not just a minus sign)
- Loading states shown while amounts are fetched

## Performance (MEDIUM)

- No layout shift on page load (CLS < 0.1)
- Interactive within 3s on 4G throttled
- Images lazy-loaded below the fold
- No unnecessary re-renders on scroll or input

## Production Readiness (MEDIUM)

- Error states shown for failed API calls (not blank screens)
- Empty states shown for zero-data scenarios
- Loading skeletons for async content
- Confirmation dialogs on destructive actions
- Toast/notification feedback on mutations

## Rules

- Audit on real devices or throttled DevTools — not just desktop Chrome
- Test with keyboard only (no mouse) for full flow
- Check both light and dark mode if supported
- Money display issues are P0 — never ship incorrect amounts
