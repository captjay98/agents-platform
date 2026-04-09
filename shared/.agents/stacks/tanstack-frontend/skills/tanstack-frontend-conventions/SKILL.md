---
name: tanstack-frontend-conventions
description: Cross-project frontend conventions for TanStack Router SPAs — routing, API layer, state management, auth guards, and component organization. Use when building frontend features in Projavi or DeliveryNexus.
---

# TanStack Frontend Conventions

Shared patterns across Projavi and DeliveryNexus frontends. These are SPAs with TanStack Router — no SSR server functions.

## Directory Layout (CRITICAL)

```
frontend/
├── app/routes/              # File-based routes (TanStack Router)
│   ├── __root.tsx           # HTML shell, providers, global CSS
│   ├── _layout.tsx          # Pathless layout (no URL segment)
│   └── domain/              # Domain route folders
├── components/
│   ├── ui/                  # shadcn/ui primitives (Radix + CVA + tailwind-merge)
│   ├── layout/              # App shell (Header, Sidebar, BottomNav)
│   └── [domain]/            # Domain-grouped components
├── lib/
│   ├── services/            # API service modules (one per domain)
│   ├── stores/              # Zustand stores (one per domain)
│   ├── config/              # App configuration
│   ├── constants/           # Static constants
│   ├── utils/               # Pure utility functions
│   └── types/               # TypeScript type definitions
└── providers/               # React context providers
```

## Root Route (CRITICAL)

`__root.tsx` renders the full HTML document with providers nested in order:

```typescript
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'App Title' },
      ],
      links: [{ rel: 'stylesheet', href: appCss }],
    }),
    component: RootComponent,
    errorComponent: AppErrorComponent,
    notFoundComponent: NotFoundComponent,
  },
)

function RootComponent() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <RealtimeProvider>
              <Outlet />
              <Toaster />
            </RealtimeProvider>
          </QueryProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

## Auth Guards (CRITICAL)

Use pathless layout routes (prefixed `_`) as guards. Check auth in the component, not `beforeLoad`:

```typescript
// routes/_protected.tsx — wraps all authenticated routes
export const Route = createFileRoute('/_protected')({ component: ProtectedLayout })

function ProtectedLayout() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore()
  useEffect(() => { checkAuth(true) }, [])

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/auth/login" />
  return <Outlet />
}

// Role-based guard
function BusinessLayout() {
  const { user } = useAuthStore()
  if (!canAccessBusinessPortal(user)) return <AccessDeniedPage />
  return <Outlet />
}
```

## API Layer (CRITICAL)

Session-based auth (cookies). Axios with `withCredentials` and XSRF:

```typescript
// lib/services/apiClient.ts
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

// Domain service files — one per domain
// lib/services/authService.ts
export const authService = {
  login: (data: LoginInput) => client.post<ApiResponse<User>>('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get<ApiResponse<User>>('/auth/me'),
}
```

Server-side API calls (in `beforeLoad`/loaders) use native fetch:

```typescript
// lib/services/serverApiClient.ts
const API_BASE = getConfiguredApiBaseUrl()

export async function fetchTenantData(host: string) {
  const res = await fetch(`${API_BASE}/tenant/landing`, {
    headers: { 'X-Tenant-Host': host },
  })
  return res.json()
}
```

## State Management (HIGH)

Zustand stores per domain with `persist` middleware:

```typescript
// lib/stores/authStore.ts
interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  checkAuth: (force?: boolean) => Promise<boolean>
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      isLoading: true,
      checkAuth: async (force) => { /* ... */ },
      clearAuth: () => set({ isAuthenticated: false, user: null }),
    }),
    { name: 'auth-storage' },
  ),
)
```

## Forms (HIGH)

react-hook-form + zod + @hookform/resolvers:

```typescript
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

function MyForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  return (
    <Form {...form}>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </Form>
  )
}
```

## Realtime (MEDIUM)

Laravel Echo + Pusher.js for WebSocket events from Laravel Reverb:

```typescript
// providers/RealtimeProvider.tsx
const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
})
```

## Rules

- Always use `createRootRouteWithContext` to pass `queryClient` through router context
- Pathless layouts (`_name.tsx`) for guards — never redirect in `beforeLoad` for auth
- One Zustand store per domain, always with `persist` for session survival
- One service file per API domain in `lib/services/`
- UI primitives in `components/ui/` (shadcn pattern), domain components in `components/[domain]/`
- Global CSS imported as `?url` in root `head()`
- Deploy target is Cloudflare Workers via wrangler
