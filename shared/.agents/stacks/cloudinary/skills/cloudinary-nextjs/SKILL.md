---
name: cloudinary-nextjs
description: Image and video management with Cloudinary in Next.js. Use when uploading images, applying transformations, using the CldImage component, or managing media assets.
---

# Cloudinary — Next.js

## Installation

```bash
npm install next-cloudinary cloudinary
```

## `.env`

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## CldImage component (optimized display)

```tsx
import { CldImage } from 'next-cloudinary'

// Basic usage
<CldImage
  src="samples/woman-on-a-football-field"
  width={800}
  height={600}
  alt="Description"
/>

// With transformations
<CldImage
  src={imagePublicId}
  width={400}
  height={400}
  alt="Avatar"
  crop="fill"
  gravity="face"
  quality="auto"
  format="auto"
/>

// Responsive
<CldImage
  src={imagePublicId}
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Product image"
  className="object-cover"
/>
```

## Upload widget (client-side)

```tsx
import { CldUploadWidget } from 'next-cloudinary'

function ImageUploader({ onUpload }: { onUpload: (url: string, publicId: string) => void }) {
  return (
    <CldUploadWidget
      uploadPreset="your_unsigned_preset"  // create in Cloudinary dashboard
      onSuccess={(result) => {
        if (result.info && typeof result.info === 'object') {
          onUpload(result.info.secure_url, result.info.public_id)
        }
      }}
    >
      {({ open }) => (
        <button type="button" onClick={() => open()}>
          Upload Image
        </button>
      )}
    </CldUploadWidget>
  )
}
```

## Server-side upload (API route)

```ts
// app/api/upload/route.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'uploads',
        resource_type: 'auto',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      },
    ).end(buffer)
  })

  return Response.json({
    url: result.secure_url,
    publicId: result.public_id,
  })
}
```

## Transformations

```ts
// Resize and crop
src={publicId} width={300} height={300} crop="fill" gravity="auto"

// Face detection crop
src={publicId} width={200} height={200} crop="thumb" gravity="face"

// Background removal (requires Cloudinary AI add-on)
src={publicId} removeBackground

// Overlay text
src={publicId} overlays={[{
  text: { content: 'Watermark', fontSize: 40, fontFamily: 'Arial' },
  position: { gravity: 'south_east', x: 10, y: 10 },
  effects: [{ opacity: 50 }],
}]}
```

## Delete image (server-side)

```ts
import { v2 as cloudinary } from 'cloudinary'

async function deleteImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId)
}
```

## Anti-patterns

- Don't use unsigned upload presets for sensitive content — use signed uploads for private assets
- Don't store full Cloudinary URLs in DB — store only `public_id` and reconstruct URLs with transformations
- Don't skip `format="auto"` and `quality="auto"` — they significantly reduce file sizes
- Don't expose `CLOUDINARY_API_SECRET` to the client — only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is safe
