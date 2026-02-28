---
name: tiptap-setup
description: Rich text editor with Tiptap in React. Use when building a WYSIWYG editor, configuring extensions, handling content output, or building a custom toolbar.
---

# Tiptap — React

## Installation

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
# Common extensions
npm install @tiptap/extension-underline @tiptap/extension-placeholder
npm install @tiptap/extension-image @tiptap/extension-link @tiptap/extension-text-align
```

## Basic editor

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded-lg overflow-hidden">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[200px]" />
    </div>
  )
}
```

## Toolbar

```tsx
import { Editor } from '@tiptap/react'

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex gap-1 p-2 border-b bg-gray-50 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet List"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Ordered List"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading"
      >
        H2
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm ${active ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}
```

## React Hook Form integration

```tsx
import { Controller } from 'react-hook-form'

<Controller
  name="description"
  control={control}
  render={({ field }) => (
    <RichTextEditor
      content={field.value}
      onChange={field.onChange}
    />
  )}
/>
```

## Content output formats

```ts
editor.getHTML()    // '<p>Hello <strong>world</strong></p>'
editor.getText()    // 'Hello world'
editor.getJSON()    // { type: 'doc', content: [...] }

// Set content programmatically
editor.commands.setContent('<p>New content</p>')
editor.commands.setContent({ type: 'doc', content: [...] })
editor.commands.clearContent()
```

## Read-only display

```tsx
// For displaying stored HTML content without editing
function ContentDisplay({ html }: { html: string }) {
  return (
    <RichTextEditor
      content={html}
      editable={false}
    />
  )
}
```

## Image upload extension

```ts
import Image from '@tiptap/extension-image'

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      class: { default: 'max-w-full rounded' },
    }
  },
})

// Insert image
editor.chain().focus().setImage({ src: uploadedUrl, alt: 'description' }).run()
```

## Anti-patterns

- Don't store raw HTML without sanitization — sanitize on the server before saving
- Don't use `editor.getHTML()` for display without DOMPurify — XSS risk
- Don't forget `type="button"` on toolbar buttons — they'll submit forms
- Don't initialize editor with `null` content — use empty string `''`
