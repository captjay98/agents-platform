---
name: tailwind-v4
description: Tailwind CSS v4 patterns — configuration, utilities, variants, and component patterns. Use when styling with Tailwind v4.
---

# Tailwind CSS v4

Tailwind v4 is a ground-up rewrite with CSS-first configuration, a new engine, and breaking changes from v3.

## Setup (CRITICAL)

```bash
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* app/globals.css — replaces tailwind.config.js */
@import "tailwindcss";

/* Custom theme tokens */
@theme {
  --color-brand: oklch(0.6 0.2 250);
  --color-brand-dark: oklch(0.4 0.2 250);
  --font-sans: "Inter", sans-serif;
  --radius-card: 0.75rem;
  --spacing-section: 4rem;
}
```

## Key v4 Changes from v3 (CRITICAL)

| v3 | v4 |
|----|-----|
| `tailwind.config.js` | `@theme {}` in CSS |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `content: [...]` | Auto-detected from source files |
| `theme.extend.colors` | `--color-*` CSS variables |
| `bg-opacity-50` | `bg-black/50` |
| `text-opacity-75` | `text-black/75` |
| `ring-offset-*` | Removed (use `outline-offset-*`) |
| `decoration-slice` | `box-decoration-slice` |

## Configuration (HIGH)

```css
/* All configuration lives in CSS */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary: oklch(0.55 0.22 264);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.96 0.01 264);
  --color-destructive: oklch(0.55 0.22 27);
  --color-muted: oklch(0.96 0.01 264);
  --color-muted-foreground: oklch(0.55 0.02 264);
  --color-border: oklch(0.9 0.01 264);
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0.02 264);

  /* Typography */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Spacing */
  --spacing-18: 4.5rem;
  --spacing-88: 22rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}

/* Dark mode via CSS variables */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: oklch(0.1 0.02 264);
    --color-foreground: oklch(0.98 0 0);
    --color-border: oklch(0.2 0.02 264);
  }
}

/* Or class-based dark mode */
.dark {
  --color-background: oklch(0.1 0.02 264);
}
```

## Utility Patterns (HIGH)

```html
<!-- Responsive design — same as v3 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- Dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

<!-- State variants -->
<button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">

<!-- Group and peer -->
<div class="group">
  <div class="opacity-0 group-hover:opacity-100 transition-opacity">Tooltip</div>
</div>

<!-- Arbitrary values -->
<div class="w-[calc(100%-2rem)] top-[117px] bg-[#1da1f2]">

<!-- CSS variable colors (v4) -->
<div class="bg-primary text-primary-foreground">
```

## Custom Utilities (MEDIUM)

```css
/* Define custom utilities */
@utility container-query {
  container-type: inline-size;
}

@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

/* Usage */
/* <div class="container-query scrollbar-hide"> */
```

## Component Patterns (MEDIUM)

```css
/* Extract repeated patterns with @apply */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2;
    @apply disabled:pointer-events-none disabled:opacity-50;
  }

  .btn-primary {
    @apply btn bg-primary text-primary-foreground hover:bg-primary/90;
  }

  .card {
    @apply rounded-xl border border-border bg-background p-6 shadow-sm;
  }
}
```

## Rules

- Never use `tailwind.config.js` in v4 — all config goes in `@theme {}` in CSS
- Use `@import "tailwindcss"` not `@tailwind base/components/utilities`
- Use `bg-color/opacity` syntax — not `bg-opacity-*` (removed in v4)
- Use `oklch()` for custom colors — better perceptual uniformity than hex
- Auto-detection replaces `content: [...]` — no manual file globs needed
