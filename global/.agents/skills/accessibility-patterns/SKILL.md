---
name: accessibility-patterns
description: WCAG compliance and accessibility best practices for modern web applications
---

## WCAG 2.1 Level AA Compliance

### Perceivable

**Text Alternatives**

- All images have alt text
- Icons have aria-label or aria-labelledby
- Form inputs have associated labels

**Color Contrast**

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Responsive Design**

- Text can be resized to 200% without loss of functionality
- No horizontal scrolling at 320px width
- Touch targets minimum 44x44px

### Operable

**Keyboard Navigation**

```typescript
// All interactive elements keyboard accessible
<button onClick={handleClick} onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') handleClick()
}}>
  Action
</button>

// Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

**Focus Management**

- Visible focus indicators
- Logical tab order
- Focus trapped in modals
- Focus restored after modal close

**No Keyboard Traps**

- Users can navigate away from all components
- Modals have Escape key to close

### Understandable

**Form Validation**

```typescript
// Clear error messages
<Input
  aria-invalid={!!error}
  aria-describedby={error ? "error-message" : undefined}
/>
{error && <span id="error-message" role="alert">{error}</span>}
```

**Consistent Navigation**

- Same navigation structure across pages
- Predictable component behavior
- Clear labels and instructions

### Robust

**Semantic HTML**

```typescript
// Use proper HTML elements
<nav>...</nav>
<main>...</main>
<article>...</article>
<button> not <div onClick>
```

**ARIA Landmarks**

```typescript
<header role="banner">
<nav role="navigation" aria-label="Main">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">
```

## Testing Checklist

- [ ] Keyboard-only navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA
- [ ] Forms have proper labels and error messages
- [ ] Images have alt text
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Responsive at 320px width
- [ ] Text can zoom to 200%

## Tools

- **axe DevTools**: Browser extension for automated checks
- **NVDA/JAWS**: Screen reader testing
- **Lighthouse**: Accessibility audit
- **Color contrast checker**: WebAIM contrast checker

## Common Issues

- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Keyboard traps in modals
- No focus indicators
- Non-semantic HTML (div soup)
