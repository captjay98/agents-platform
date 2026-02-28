---
alwaysApply: true
---

# TanStack Frontend Rules

1. **Never fetch data directly in components** — all server state goes through TanStack Query (`useQuery`, `useMutation`); no raw `fetch` or `axios` calls in component bodies.
2. **Always define query keys as constants** — never inline query key strings; use a centralized `queryKeys` object to prevent cache key drift.
3. **Never mutate query cache directly** — use `queryClient.invalidateQueries()` or `setQueryData()` after mutations; never manually patch cached data with local state.
4. **Always handle loading, error, and empty states** — every `useQuery` consumer must render all three states explicitly; no silent failures.
5. **Never use `enabled: false` as a permanent pattern** — conditional queries should use proper dependency keys, not disabled flags as a workaround.
6. **Always set appropriate `staleTime`** — default staleTime of 0 causes unnecessary refetches; set per-query based on data freshness requirements.
