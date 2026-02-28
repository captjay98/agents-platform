---
name: cloudflare-r2-typescript
description: Cloudflare R2 object storage in Workers/TanStack Start. Use when uploading, downloading, deleting files or generating signed URLs via R2 bindings.
---

# Cloudflare R2 — TypeScript

## Wrangler binding setup

```jsonc
// wrangler.jsonc
{
  "r2_buckets": [
    { "binding": "PUBLIC_STORAGE_BUCKET", "bucket_name": "my-public-bucket" },
    { "binding": "PRIVATE_STORAGE_BUCKET", "bucket_name": "my-private-bucket" }
  ]
}
```

## Provider pattern

```ts
import { env } from 'cloudflare:workers'

export class R2Provider {
  private getBucket(access: 'public' | 'private' = 'private') {
    return access === 'public'
      ? (env as any).PUBLIC_STORAGE_BUCKET
      : (env as any).PRIVATE_STORAGE_BUCKET
  }

  async upload(
    key: string,
    content: ArrayBuffer | Uint8Array,
    contentType: string,
    options: { access?: 'public' | 'private'; maxAge?: number; metadata?: Record<string, string> } = {},
  ): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
    const bucket = this.getBucket(options.access)
    if (!bucket) return { success: false, error: 'R2 bucket not configured' }

    const httpMetadata: Record<string, string> = { contentType }
    if (options.access === 'public' && options.maxAge) {
      httpMetadata.cacheControl = `public, max-age=${options.maxAge}`
    }

    await bucket.put(key, content, {
      httpMetadata,
      customMetadata: options.metadata,
    })

    const url = options.access === 'public'
      ? `${env.R2_PUBLIC_CDN_URL}/${key}`
      : await this.getSignedUrl(key, 3600)

    return { success: true, url, key }
  }

  async download(key: string): Promise<{ success: boolean; content?: ArrayBuffer; contentType?: string; error?: string }> {
    const bucket = (env as any).PRIVATE_STORAGE_BUCKET ?? (env as any).PUBLIC_STORAGE_BUCKET
    if (!bucket) return { success: false, error: 'R2 bucket not configured' }

    const object = await bucket.get(key)
    if (!object) return { success: false, error: 'File not found' }

    return {
      success: true,
      content: await object.arrayBuffer(),
      contentType: object.httpMetadata?.contentType,
    }
  }

  async delete(key: string): Promise<{ success: boolean; error?: string }> {
    const bucket = (env as any).PRIVATE_STORAGE_BUCKET ?? (env as any).PUBLIC_STORAGE_BUCKET
    if (!bucket) return { success: false, error: 'R2 bucket not configured' }
    await bucket.delete(key)
    return { success: true }
  }

  async list(prefix?: string): Promise<R2Objects> {
    const bucket = (env as any).PRIVATE_STORAGE_BUCKET
    return bucket.list({ prefix })
  }

  // For private files: return a URL via a signed worker route, not R2 presigned URLs
  // R2 presigned URLs require S3-compat API — use a worker auth route instead
  async getSignedUrl(key: string, _expiresIn: number): Promise<string> {
    return `${env.R2_PRIVATE_URL ?? ''}/${key}`
  }
}
```

## Key naming conventions

```ts
// Use structured keys for easy listing/deletion
const key = `users/${userId}/avatars/${Date.now()}-${filename}`
const key = `listings/${listingId}/photos/${uuid}.webp`
const key = `exports/${orgId}/${date}/${reportId}.pdf`
```

## Public bucket + CDN

```ts
// Public bucket: serve via Cloudflare CDN URL, not R2 directly
// Set R2_PUBLIC_CDN_URL = https://assets.yourdomain.com in env
// Configure custom domain on R2 bucket in dashboard

// Cache-Control for public assets
httpMetadata.cacheControl = 'public, max-age=31536000, immutable' // static assets
httpMetadata.cacheControl = 'public, max-age=3600'                // user uploads
```

## Private file access pattern

```ts
// Don't expose R2 keys directly — serve through a worker route with auth
// app/routes/api/files.$key.ts
export async function loader({ params, request }: LoaderArgs) {
  const user = await requireAuth(request)
  const key = `users/${user.id}/${params.key}`

  const { env } = await import('cloudflare:workers')
  const object = await (env as any).PRIVATE_STORAGE_BUCKET.get(key)
  if (!object) throw new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
```

## Image upload with compression

```ts
import { compressImage } from 'browser-image-compression'

async function uploadPhoto(file: File, userId: string) {
  const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 })
  const buffer = await compressed.arrayBuffer()

  const key = `users/${userId}/photos/${crypto.randomUUID()}.webp`
  return r2.upload(key, buffer, 'image/webp', {
    access: 'public',
    maxAge: 86400 * 30,
  })
}
```

## Multipart upload (large files)

```ts
// R2 supports multipart for files > 100MB
const upload = await bucket.createMultipartUpload(key, { httpMetadata: { contentType } })
const parts: R2UploadedPart[] = []

for (let i = 0; i < chunks.length; i++) {
  const part = await upload.uploadPart(i + 1, chunks[i])
  parts.push(part)
}

await upload.complete(parts)
```

## Wrangler local dev

```bash
# Local R2 dev — files stored in .wrangler/state/v3/r2/
wrangler dev
# Or use miniflare directly for tests
```

## Anti-patterns

- Don't use `@aws-sdk/client-s3` in Workers — use native R2 bindings (zero latency, no egress fees)
- Don't store R2 keys in URLs directly for private files — always proxy through auth route
- Don't skip `httpMetadata.contentType` — browsers need it to render files correctly
