---
globs:
  - "**/middleware.ts"
  - "**/proxy.ts"
  - "**/layout.tsx"
  - "**/page.tsx"
alwaysApply: false
---

# Next.js Defense-in-Depth Auth

Never rely on a single layer for authentication. Check auth at every level:

## 1. Middleware / Proxy (first line)
```ts
// middleware.ts (v14-15) or proxy.ts (v16+)
export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

## 2. Layout (second line)
```tsx
// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <>{children}</>
}
```

## 3. Page / Server Action (third line)
```tsx
// app/dashboard/settings/page.tsx
export default async function SettingsPage() {
  const session = await getSession()
  if (!session) unauthorized()
  if (!session.isAdmin) forbidden()
  return <Settings />
}
```

## Why All Three?
- Middleware can be bypassed by direct navigation or prefetching
- Layouts don't re-render on client-side navigation between sibling routes
- Server Actions are callable directly — always verify auth inside them
