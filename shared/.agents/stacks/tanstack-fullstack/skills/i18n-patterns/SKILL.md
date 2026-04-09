---
name: i18n-patterns
description: Internationalization with react-i18next — lazy namespace loading via import.meta.glob, route-based preloading, and multi-language support. Use when adding UI strings or supporting multiple languages.
---

# i18n Patterns

react-i18next with lazy-loaded namespaces. Only bootstrap namespaces load at startup; feature namespaces load on demand.

## Setup (CRITICAL)

```typescript
// lib/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { bootstrapEn } from './locales/en/bootstrap'
import { BOOTSTRAP_I18N_NAMESPACES } from './namespaces'
import { i18nNamespaceBackend } from './namespace-loader'

const resources = { en: bootstrapEn }

i18n
  .use(i18nNamespaceBackend)
  .use(initReactI18next)
  .init({
    lng: getSavedLanguage() ?? 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: BOOTSTRAP_I18N_NAMESPACES,
    resources,
    interpolation: { escapeValue: false },
  })
```

## Namespace Organization (CRITICAL)

```typescript
// lib/i18n/namespaces.ts
export const I18N_NAMESPACES = [
  'common', 'auth', 'dashboard', 'settings', 'errors',
  'batches', 'farms', 'inventory', 'sales', 'customers',
  // ... feature namespaces
] as const

// Bootstrap namespaces — loaded at startup (keep minimal)
export const BOOTSTRAP_I18N_NAMESPACES = ['common', 'auth', 'errors'] as const
```

## Namespace Loader (CRITICAL)

Uses `import.meta.glob` for lazy loading — only fetches when a namespace is first used:

```typescript
// lib/i18n/namespace-loader.ts
const directLoaders = import.meta.glob(
  ['./locales/*/*.ts', '!./locales/*/index.ts', '!./locales/en/bootstrap.ts'],
  { import: 'default' },
)
const indexedLoaders = import.meta.glob(
  ['./locales/*/*/index.ts'],
  { import: 'default' },
)

// Custom i18next backend that resolves from glob loaders
export const i18nNamespaceBackend = {
  type: 'backend' as const,
  read(language: string, namespace: string, callback: BackendReadCallback) {
    const key = `./locales/${language}/${namespace}`
    const loader = namespaceLoaders.get(key)
    if (!loader) { callback(null, {}); return }
    loader().then(res => callback(null, res as Record<string, unknown>))
           .catch(err => callback(err))
  },
}
```

## Locale File Structure (HIGH)

```
lib/i18n/locales/
├── en/
│   ├── bootstrap.ts          # Only common + auth + errors (loaded at startup)
│   ├── common/index.ts       # Shared UI strings
│   ├── auth.ts               # Auth screens
│   ├── batches.ts            # Feature namespace (lazy)
│   ├── farms.ts              # Feature namespace (lazy)
│   └── dashboard/index.ts    # Complex namespace with subdirectory
├── ha/                       # Hausa
│   ├── common/index.ts
│   ├── batches.ts
│   └── ...
├── yo/                       # Yoruba
└── sw/                       # Swahili
```

## Using Translations (HIGH)

```typescript
import { useTranslation } from 'react-i18next'

function BatchesPage() {
  const { t } = useTranslation('batches')  // Lazy-loads 'batches' namespace
  return <h1>{t('pageTitle')}</h1>
}

// Multiple namespaces
function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  return <p>{t('dashboard:welcome')} — {t('common:save')}</p>
}

// Interpolation
t('publishedAt', { date: formatDate(post.publishedAt) })
// → "Published April 8, 2026"
```

## Adding a New Language (MEDIUM)

1. Create `lib/i18n/locales/{code}/` directory
2. Add bootstrap file with `common`, `auth`, `errors` translations
3. Add feature namespace files matching English structure
4. Add language to the language selector UI

## Rules

- Bootstrap namespaces (`common`, `auth`, `errors`) load at startup — keep them small
- Feature namespaces load on demand via `import.meta.glob` — no upfront cost
- One `.ts` file per namespace per language
- Use subdirectory with `index.ts` for complex namespaces
- Never hardcode UI strings — always use `t('namespace:key')`
- Language preference stored in `localStorage` via `LANGUAGE_STORAGE_KEY`
