---
name: zustand-patterns
description: Zustand state management patterns for React. Use when creating stores, slicing state, persisting to localStorage, or integrating with async data.
---

# Zustand Patterns

## Basic store

```ts
import { create } from 'zustand'

interface CartStore {
  items: CartItem[]
  total: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clear: () => void
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) =>
    set((state) => {
      const items = [...state.items, item]
      return { items, total: items.reduce((sum, i) => sum + i.price, 0) }
    }),

  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((i) => i.id !== id)
      return { items, total: items.reduce((sum, i) => sum + i.price, 0) }
    }),

  clear: () => set({ items: [], total: 0 }),
}))
```

## Slice pattern (large stores)

```ts
import { create, StateCreator } from 'zustand'

// Auth slice
interface AuthSlice {
  user: User | null
  token: string | null
  setUser: (user: User, token: string) => void
  logout: () => void
}

const createAuthSlice: StateCreator<AuthSlice & UISlice, [], [], AuthSlice> = (set) => ({
  user: null,
  token: null,
  setUser: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
})

// UI slice
interface UISlice {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

const createUISlice: StateCreator<AuthSlice & UISlice, [], [], UISlice> = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
})

// Combined store
export const useStore = create<AuthSlice & UISlice>()((...args) => ({
  ...createAuthSlice(...args),
  ...createUISlice(...args),
}))
```

## Persistence (localStorage)

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsStore {
  theme: 'light' | 'dark'
  language: string
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, language: state.language }), // only persist these
    },
  ),
)
```

## Selective subscriptions (prevent re-renders)

```ts
// ✅ Subscribe to specific field — only re-renders when user changes
const user = useStore((state) => state.user)

// ✅ Multiple fields with shallow comparison
import { useShallow } from 'zustand/react/shallow'
const { user, token } = useStore(useShallow((state) => ({ user: state.user, token: state.token })))

// ❌ Avoid — re-renders on any store change
const store = useStore()
```

## Async actions

```ts
interface OrderStore {
  orders: Order[]
  loading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const orders = await api.getOrders()
      set({ orders, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed', loading: false })
    }
  },
}))
```

## Accessing store outside React

```ts
// Get current state
const { user } = useAuthStore.getState()

// Subscribe to changes
const unsub = useAuthStore.subscribe((state) => {
  console.log('Auth changed:', state.user)
})
unsub() // cleanup
```

## Reset store

```ts
const initialState = { items: [], total: 0 }

export const useCartStore = create<CartStore>((set) => ({
  ...initialState,
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  reset: () => set(initialState),
}))
```

## Anti-patterns

- Don't put server state in Zustand — use TanStack Query for server data, Zustand for UI/client state
- Don't subscribe to the whole store — always select specific fields
- Don't mutate state directly — always use `set()`
- Don't persist sensitive data (tokens) in localStorage — use secure storage
