---
alwaysApply: true
---

# Firebase Rules

1. **Never deploy with `allow read, write: if true`** — every collection must have explicit security rules before going to production.
2. **Always validate data shape in security rules** — use `request.resource.data.keys().hasAll([...])` to enforce required fields at the rules level.
3. **Never trust client-sent UIDs** — always derive the user identity from `request.auth.uid`, never from document fields sent by the client.
4. **Always scope Firestore queries server-side** — never rely on security rules alone to filter data; query only what the user is allowed to see.
5. **Never store secrets or API keys in Firestore documents** — use Firebase Remote Config or server-side environment variables instead.
6. **Always use Firebase Admin SDK on the server** — client SDK must never be used in server-side code where elevated privileges are needed.
