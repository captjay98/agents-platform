---
alwaysApply: false
---

# Tailwind CSS Conventions

1. **Use semantic color names** — define `--color-primary`, `--color-destructive` etc. in `@theme {}`, not raw color values in classes
2. **Use `oklch()` for custom colors** — better perceptual uniformity than hex or hsl
3. **Never use `@apply` for one-off styles** — only for reusable component patterns
4. **Use slash syntax for opacity** — `bg-black/50` not `bg-opacity-50` (v4)
5. **Order classes consistently** — layout → spacing → typography → colors → states
6. **Extract components with `@layer components`** — when a pattern repeats 3+ times
7. **Never hardcode breakpoints** — use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)

```html
<!-- ✅ Consistent class ordering -->
<button class="
  flex items-center gap-2
  px-4 py-2
  text-sm font-medium
  bg-primary text-primary-foreground
  rounded-md
  hover:bg-primary/90 disabled:opacity-50
  transition-colors
">

<!-- ❌ Avoid raw opacity utilities (v4) -->
<div class="bg-opacity-50 text-opacity-75">

<!-- ✅ Use slash syntax -->
<div class="bg-black/50 text-black/75">
```
