---
name: nextjs-upgrade
description: Upgrade Next.js to the latest version using official migration guides and codemods. Use when upgrading between major versions.
---

# Next.js Upgrade

Adapted from the official `vercel-labs/next-skills` repo.

## Instructions

1. **Detect current version**
```bash
cat package.json | grep -E '"next"|"react"|"react-dom"'
```

2. **Fetch the upgrade guide** for your target version:
   - https://nextjs.org/docs/app/guides/upgrading/version-16
   - https://nextjs.org/docs/app/guides/upgrading/version-15
   - https://nextjs.org/docs/app/guides/upgrading/version-14
   - Codemods: https://nextjs.org/docs/app/guides/upgrading/codemods

3. **Upgrade incrementally** for major version jumps (13 → 14 → 15 → 16).

4. **Run codemods first**
```bash
npx @next/codemod@latest <transform> <path>
```

Key transforms:
| Codemod | Version | What it does |
|---------|---------|-------------|
| `next-async-request-api` | v15 | Makes params/cookies/headers async |
| `next-request-geo-ip` | v15 | Migrates geo/ip properties |
| `next-dynamic-access-named-export` | v15 | Transforms dynamic imports |

5. **Update dependencies**
```bash
npm install next@latest react@latest react-dom@latest
npm install @types/react@latest @types/react-dom@latest  # if TypeScript
```

6. **Key breaking changes by version**

### v14 → v15
- `params` and `searchParams` are now `Promise<...>` — must `await`
- `cookies()` and `headers()` are now async
- `fetch()` no longer cached by default
- Run `npx @next/codemod@latest next-async-request-api .`

### v15 → v16
- `middleware.ts` → `proxy.ts` (renamed)
- `middleware()` → `proxy()`, `config` → `proxyConfig`
- Cache Components replace `experimental.ppr` → `cacheComponents: true`
- `'use cache'` directive replaces `revalidate` / `revalidateTag`
- Run `npx @next/codemod@latest upgrade`

7. **Test the upgrade**
```bash
npm run build    # Check for build errors
npm run dev      # Test key functionality
npm run lint     # Check for new lint rules
```
