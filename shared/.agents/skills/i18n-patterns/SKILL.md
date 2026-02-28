---
name: i18n-patterns
description: Internationalization with react-i18next — setup, namespace organization, and adding translations. Use when adding UI strings or supporting multiple languages.
---

# i18n Patterns

react-i18next with namespace-based organization and lazy-loaded language bundles.

## Setup (CRITICAL)

```bash
npm install react-i18next i18next
```

```typescript
// lib/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  resources: { en },
  interpolation: { escapeValue: false },
})

export default i18n
```

## Namespace Organization (CRITICAL)

```typescript
// lib/i18n/locales/en/index.ts
export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    loading: 'Loading...',
    error: 'Something went wrong',
    required: 'This field is required',
  },
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
  },
  posts: {
    pageTitle: 'Posts',
    createPost: 'Create Post',
    editPost: 'Edit Post',
    deletePost: 'Delete Post',
    noPostsFound: 'No posts found',
    publishedAt: 'Published {{date}}',
  },
  errors: {
    notFound: 'Page not found',
    unauthorized: 'You need to sign in',
    forbidden: 'You do not have permission',
    serverError: 'Server error. Please try again.',
  },
}

export type Translations = typeof en
```

## Using Translations (HIGH)

```typescript
import { useTranslation } from 'react-i18next'

// Single namespace
function PostsPage() {
  const { t } = useTranslation('posts')
  return <h1>{t('pageTitle')}</h1>
}

// Multiple namespaces
function PostForm() {
  const { t } = useTranslation(['posts', 'common'])
  return (
    <form>
      <h2>{t('posts:createPost')}</h2>
      <button type="submit">{t('common:save')}</button>
      <button type="button">{t('common:cancel')}</button>
    </form>
  )
}

// With interpolation
function PostMeta({ publishedAt }: { publishedAt: Date }) {
  const { t } = useTranslation('posts')
  return <span>{t('publishedAt', { date: publishedAt.toLocaleDateString() })}</span>
}
```

## Lazy Loading Languages (HIGH)

```typescript
// lib/i18n/lazy-loader.ts
export async function loadLanguage(lang: string): Promise<void> {
  if (lang === 'en') return  // English loaded at boot

  const { [lang]: translations } = await import(`./locales/${lang}/index.ts`)

  Object.entries(translations).forEach(([namespace, resources]) => {
    i18n.addResourceBundle(lang, namespace, resources, true, true)
  })

  await i18n.changeLanguage(lang)
}

// lib/i18n/provider.tsx
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useUserPreferences()

  useEffect(() => {
    if (language && language !== 'en') {
      loadLanguage(language)
    }
  }, [language])

  return <>{children}</>
}
```

## Adding a New Key (MEDIUM)

1. Add to English namespace in `locales/en/`
2. Add to every other language's matching namespace
3. Use in component with `t('namespace:key')`

```typescript
// 1. Add to English
// locales/en/index.ts
posts: {
  // ... existing keys
  featuredBadge: 'Featured',  // New key
}

// 2. Add to other languages
// locales/es/index.ts
posts: {
  // ... existing keys
  featuredBadge: 'Destacado',
}

// 3. Use in component
const { t } = useTranslation('posts')
return <Badge>{t('featuredBadge')}</Badge>
```

## Pluralization (MEDIUM)

```typescript
// Locale definition
items: {
  count_one: '{{count}} item',
  count_other: '{{count}} items',
}

// Usage
t('items.count', { count: itemCount })
// count=1 → "1 item"
// count=5 → "5 items"
```

## Rules

- Never hardcode user-facing strings — always use `t('namespace:key')`
- Always use namespaced keys — `t('posts:createPost')` not `t('createPost')`
- Load English at boot, lazy-load other languages on demand
- Never add new namespaces casually — reuse existing ones unless there's a clear domain boundary
- Keep translation keys descriptive — `createPost` not `btn1`
