---
name: tailwind-migration
description: Migrating from Tailwind CSS v3 to v4 — automated codemod, breaking changes, and manual fixes. Use when upgrading a project to Tailwind v4.
---

# Tailwind Migration (v3 → v4)

## Automated Migration (CRITICAL)

Run the official codemod first — it handles most breaking changes automatically:

```bash
npx @tailwindcss/upgrade@next
```

This handles:
- Updates `tailwind.config.js` → `@theme {}` in CSS
- Replaces `@tailwind` directives with `@import "tailwindcss"`
- Renames deprecated utilities
- Updates PostCSS config

## Manual Fixes Required (HIGH)

After running the codemod, check for these patterns that require manual attention:

### Removed Utilities

```html
<!-- ❌ v3 — removed in v4 -->
<div class="bg-opacity-50 text-opacity-75 border-opacity-25">

<!-- ✅ v4 — use slash syntax -->
<div class="bg-black/50 text-black/75 border-black/25">
```

```html
<!-- ❌ v3 — ring-offset removed -->
<button class="ring-2 ring-offset-2 ring-blue-500">

<!-- ✅ v4 — use outline-offset -->
<button class="ring-2 ring-blue-500 outline-offset-2">
```

### Renamed Utilities

| v3 | v4 |
|----|-----|
| `decoration-slice` | `box-decoration-slice` |
| `decoration-clone` | `box-decoration-clone` |
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `drop-shadow-sm` | `drop-shadow-xs` |
| `blur-sm` | `blur-xs` |
| `blur` | `blur-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |

### Configuration Migration

```javascript
// ❌ v3 — tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6',
        'brand-dark': '#1d4ed8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
}
```

```css
/* ✅ v4 — in CSS file */
@import "tailwindcss";

@theme {
  --color-brand: #3b82f6;
  --color-brand-dark: #1d4ed8;
  --font-sans: "Inter", sans-serif;
  --radius-card: 0.75rem;
}
```

### Plugin Migration

```javascript
// ❌ v3 — plugins in config
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
```

```css
/* ✅ v4 — plugins as CSS imports */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```

### Prefix Migration

```javascript
// ❌ v3 — prefix in config
module.exports = { prefix: 'tw-' }
```

```css
/* ✅ v4 — prefix in CSS */
@import "tailwindcss" prefix(tw);
```

## Vite Setup Change (HIGH)

```typescript
// ❌ v3 — PostCSS plugin
// postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }

// ✅ v4 — Vite plugin (recommended)
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [tailwindcss()] })
```

## Verification Checklist

After migration:
- [ ] Run `npx @tailwindcss/upgrade@next` and commit the changes
- [ ] Search for `bg-opacity-`, `text-opacity-`, `border-opacity-` — replace with `/` syntax
- [ ] Search for `ring-offset-` — replace with `outline-offset-`
- [ ] Check `tailwind.config.js` is deleted (or empty) — config moved to CSS
- [ ] Verify dark mode still works — check `darkMode` config migration
- [ ] Test all custom colors and fonts — verify `@theme {}` variables are correct
- [ ] Check third-party component libraries for v4 compatibility
