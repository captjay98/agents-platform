---
name: responsive-patterns
description: Modern responsive patterns — container queries, fluid typography, mobile-first breakpoints, and adaptive layouts in Tailwind v4. Use when building adaptive interfaces.
core_ref: agents-platform
core_version: 2026-03-03
overlay_mode: append
---

# Responsive Patterns

Technical responsive implementation patterns for the application's mobile-first, field-ready interfaces.

## When to Use

- Building new pages or components that must adapt across phone → tablet → desktop.
- Implementing component-level responsiveness (card grids, dialogs, data displays).
- Converting desktop tables to mobile card layouts.
- Setting up fluid typography or spacing.
- Debugging layout issues on specific viewport sizes.

## Breakpoint Strategy (Tailwind v4)

the application uses Tailwind's default mobile-first breakpoints:

| Prefix | Min-width | Target |
|--------|-----------|--------|
| (base) | 0px | Phones in portrait (primary target) |
| `sm:` | 640px | Landscape phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, small desktops |
| `xl:` | 1280px | Desktops |

Design mobile-first, then enhance. The base styles (no prefix) are the phone layout.

```tsx
{/* Mobile: single column → Tablet: 2 cols → Desktop: 3 cols */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} item={item} />)}
</div>
```

## Container Queries

Use container queries when a component's layout should respond to its container
width, not the viewport. Essential for components reused in different contexts (sidebar vs main content vs full-width).

### Tailwind v4 Container Queries

```tsx
{/* Parent defines the container */}
<div className="@container">
  <article className="flex flex-col @md:flex-row @md:gap-4">
    <img
      src={batch.image}
      alt=""
      className="w-full @md:w-48 @lg:w-64 aspect-video @md:aspect-square object-cover rounded-lg"
    />
    <div className="p-3 @md:p-0">
      <h3 className="text-base @md:text-lg font-semibold">{batch.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground @md:line-clamp-3">
        {batch.description}
      </p>
    </div>
  </article>
</div>
```

### Custom Container Query Utility

```css
@utility container-query {
  container-type: inline-size;
}
```

### When to Use Container vs Media Queries

| Use container queries for | Use media queries (Tailwind prefixes) for |
|---------------------------|-------------------------------------------|
| Cards, widgets, panels | Page-level layout (grid columns) |
| Components in variable-width parents | Navigation patterns (hamburger → full) |
| Reusable components across contexts | Full-page responsive behavior |

## Fluid Typography

Use `clamp()` for text that scales smoothly between breakpoints instead of jumping at fixed sizes.

### the application Type Scale (Fluid)

```css
:root {
  --text-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-card-title: clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem);
  --text-page-title: clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem);
  --text-caption: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-kpi: clamp(1.75rem, 1.5rem + 1.25vw, 2.25rem);
}
```

### Tailwind v4 Custom Utilities

```css
@utility text-fluid-body {
  font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
}

@utility text-fluid-title {
  font-size: clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem);
}

@utility text-fluid-kpi {
  font-size: clamp(1.75rem, 1.5rem + 1.25vw, 2.25rem);
}
```

## Viewport Units

Use dynamic viewport units on mobile to account for browser chrome.

```css
/* ❌ 100vh doesn't account for mobile browser UI */
.full-screen { height: 100vh; }

/* ✅ Use dynamic viewport height */
.full-screen { height: 100dvh; }

/* ✅ Safe minimum height for page shells */
.page-shell { min-height: 100dvh; }
```

| Unit | Behavior | Use for |
|------|----------|---------|
| `dvh` | Adjusts as browser chrome shows/hides | Page shells, full-screen layouts |
| `svh` | Smallest possible viewport (chrome visible) | Fixed elements, safe area calculations |
| `lvh` | Largest possible viewport (chrome hidden) | Rarely needed |
| `vh` | Static, ignores browser chrome | Avoid on mobile |

## Table → Card Transformation

the application tables transform to cards on mobile. This is a core pattern.

```tsx
function SalesTable({ sales }: { sales: Sale[] }) {
  const { format: formatCurrency } = useFormatCurrency()

  return (
    <>
      {/* Desktop: standard table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="p-3">{t('common.date')}</th>
            <th className="p-3">{t('sales.quantity')}</th>
            <th className="p-3">{t('sales.amount')}</th>
            <th className="p-3">{t('sales.customer')}</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(sale => (
            <tr key={sale.id} className="border-b">
              <td className="p-3">{format(sale.date, 'MMM d, yyyy')}</td>
              <td className="p-3">{sale.quantity}</td>
              <td className="p-3">{formatCurrency(sale.amount)}</td>
              <td className="p-3">{sale.customerName}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3">
        {sales.map(sale => (
          <div key={sale.id} className="rounded-lg border p-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {format(sale.date, 'MMM d, yyyy')}
              </span>
              <span className="font-semibold">
                {formatCurrency(sale.amount)}
              </span>
            </div>
            <div className="text-sm">
              {sale.quantity} {t('sales.birds')} — {sale.customerName}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

### Priority Collapse Rules

On mobile cards, show information in this priority:

1. Primary identifier (date, name) + primary value (amount, quantity) — always visible
2. Secondary context (customer, batch name) — visible but smaller
3. Tertiary metadata (notes, reference numbers) — hidden or behind "View" tap

## Responsive Images

```tsx
{/* Default: lazy load everything */}
<img
  src={photo.url}
  alt={photo.description}
  loading="lazy"
  decoding="async"
  className="w-full h-auto rounded-lg"
/>

{/* Responsive with srcSet */}
<img
  src={`${photo.url}?w=400`}
  srcSet={`
    ${photo.url}?w=400 400w,
    ${photo.url}?w=800 800w,
    ${photo.url}?w=1200 1200w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt={photo.description}
  loading="lazy"
  decoding="async"
  className="w-full h-auto object-cover rounded-lg"
/>

{/* Art direction with picture */}
<picture>
  <source media="(min-width: 768px)" srcSet="/hero-wide.webp" type="image/webp" />
  <source srcSet="/hero-mobile.webp" type="image/webp" />
  <img src="/hero-mobile.jpg" alt={t('landing.heroAlt')} className="w-full h-auto" loading="eager" fetchPriority="high" />
</picture>
```

## Auto-Fit Grids

```tsx
{/* Items auto-wrap: minimum 280px each, fill available space */}
<div
  className="grid gap-4"
  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}
>
  {batches.map(batch => <BatchCard key={batch.id} batch={batch} />)}
</div>
```

## Responsive Navigation

the application uses sidebar on desktop, bottom tab bar on mobile:

```tsx
<aside className="hidden lg:flex lg:w-64 lg:flex-col border-r">
  <SidebarContent />
</aside>

<nav className="fixed bottom-0 inset-x-0 lg:hidden border-t bg-background z-50">
  <div className="flex justify-around items-center h-16">
    {tabs.map(tab => <TabItem key={tab.path} tab={tab} />)}
  </div>
</nav>

<main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
  {children}
</main>
```

## Touch Target Enforcement

| Element | Mobile (base) | Tablet (md:) | Desktop (lg:) |
|---------|---------------|--------------|----------------|
| Buttons | 48px height | 44px height | 36px height |
| Action grid items | 64×64px | 64×64px | 48×48px |
| Form inputs | 44px height | 44px height | 36px height |
| List item rows | 48px height | 44px height | 36px height |
| Icon buttons | 44×44px | 44×44px | 32×32px |

```tsx
<Button className="h-12 px-6 lg:h-9 lg:px-4 text-base lg:text-sm">
  {t('common.save')}
</Button>
```

## Common Responsive Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Horizontal overflow on mobile | Fixed-width element or table | `overflow-x-auto` wrapper or card transform |
| `100vh` gap on mobile Safari | Browser chrome not accounted for | Use `100dvh` |
| Text too small on mobile | Desktop font sizes without mobile base | Start with 16px base, scale up |
| Tap targets too close | Insufficient spacing | Minimum 8px gap between touch targets |
| Layout shift on load | Images without dimensions | Set `width`/`height` or `aspect-ratio` |
| Content behind fixed bars | Bottom nav overlapping | `pb-16 lg:pb-0` on main content |

## Rules

- Always design mobile-first: base styles are the phone layout, enhance with `sm:`, `md:`, `lg:`.
- Use container queries (`@container`) for reusable components, media queries for page layout.
- Use `dvh` instead of `vh` for any full-height layout on mobile.
- All images must have `loading="lazy"` unless above the fold.
- Tables must have a mobile card alternative — no horizontal-scroll-only tables for primary data.
- Touch targets must meet minimum sizes at every breakpoint.
- Test on a real low-end Android device or Chrome DevTools "Low-end mobile" profile.

## Related Skills

- `rugged-ui` — design philosophy, aesthetic direction, and audit standards
- `tailwind-v4` — utility classes, theme configuration, custom utilities
- `performance-audit` — Core Web Vitals and bundle optimization
- `offline-architecture` — PWA offline-first patterns
