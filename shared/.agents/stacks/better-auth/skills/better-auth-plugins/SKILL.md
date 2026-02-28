---
name: better-auth-plugins
description: Extending Better Auth with plugins — OAuth providers, two-factor auth, organizations, magic links, and admin. Use when adding auth features beyond email/password.
---

# Better Auth Plugins

Better Auth's plugin system extends core auth with additional features.

## OAuth Providers (HIGH)

```typescript
import { betterAuth } from 'better-auth'
import { github, google } from 'better-auth/social-providers'

export const auth = betterAuth({
  // ...
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})
```

```typescript
// Client — sign in with OAuth
await signIn.social({
  provider: 'github',
  callbackURL: '/dashboard',
})
```

## Two-Factor Auth (HIGH)

```typescript
import { twoFactor } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: 'MyApp',
      otpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],
})
```

```typescript
// Client setup
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
})

// Enable 2FA for user
const { totpURI, backupCodes } = await authClient.twoFactor.enable({
  password: currentPassword,
})

// Verify TOTP during sign-in
await authClient.twoFactor.verifyTotp({ code: '123456' })
```

## Organizations (MEDIUM)

```typescript
import { organization } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      membershipRoles: ['owner', 'admin', 'member'],
    }),
  ],
})
```

```typescript
// Client
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [organizationClient()],
})

// Create org
await authClient.organization.create({ name: 'Acme Corp', slug: 'acme' })

// Invite member
await authClient.organization.inviteMember({
  email: 'colleague@example.com',
  role: 'member',
  organizationId: org.id,
})

// Get active org
const { data: org } = authClient.useActiveOrganization()
```

## Magic Links (MEDIUM)

```typescript
import { magicLink } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        await sendEmail({
          to: email,
          subject: 'Sign in to MyApp',
          html: `<a href="${url}">Click to sign in</a>`,
        })
      },
    }),
  ],
})
```

```typescript
// Client
await authClient.signIn.magicLink({ email: 'user@example.com' })
```

## Admin Plugin (MEDIUM)

```typescript
import { admin } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    admin({
      defaultRole: 'user',
      adminRole: 'admin',
    }),
  ],
})
```

```typescript
// Server — admin operations
import { adminClient } from 'better-auth/client/plugins'

// List users (admin only)
const { users } = await auth.api.listUsers({
  headers: request.headers,
  query: { limit: 50, offset: 0 },
})

// Ban user
await auth.api.banUser({
  headers: request.headers,
  body: { userId: targetUserId, banReason: 'Violation of terms' },
})

// Set user role
await auth.api.setRole({
  headers: request.headers,
  body: { userId: targetUserId, role: 'admin' },
})
```

## Email Verification (MEDIUM)

```typescript
import { emailVerification } from 'better-auth/plugins'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [
    emailVerification({
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: 'Verify your email',
          html: `<a href="${url}">Verify email</a>`,
        })
      },
    }),
  ],
})
```

## Rules

- Always add plugin to both server (`auth`) and client (`authClient`) — they must match
- Never expose admin plugin endpoints without role checks
- Use `organization` plugin for multi-tenant apps — never build tenant isolation manually
- Magic links expire — always set a reasonable expiry (default 10 minutes)
