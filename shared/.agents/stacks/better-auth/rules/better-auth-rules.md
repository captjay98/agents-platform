---
alwaysApply: true
---

# Better Auth Rules

1. **Never trust client-sent session data** — always verify session server-side via `auth.api.getSession()` or middleware; never read session from request body or query params.
2. **Always protect server functions with auth checks** — every server function that accesses user data must verify the session before proceeding.
3. **Never expose raw auth errors to the client** — log the full error server-side, return a generic unauthorized response to the client.
4. **Always use Better Auth plugins through the canonical config** — never instantiate auth helpers outside the central `auth.ts` config file.
5. **Never store sensitive user data in the session payload** — keep session lean; fetch sensitive data from the DB when needed.
6. **Always handle session expiry gracefully** — redirect to login on 401, never silently fail or show broken UI.
