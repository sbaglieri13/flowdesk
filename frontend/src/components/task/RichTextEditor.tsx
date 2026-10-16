import { type Icon, ListBullets, ListNumbers, TextB, TextItalic, TextUnderline } from '../../icons/phosphor'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TextColorPicker } from './TextColorPicker'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
}

const DEFAULT_HEIGHT = 208
const MIN_HEIGHT = 120

function toolbarButtonClass(active: boolean): string {
  return `flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
    active
      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
  }`
}

export function RichTextEditor({ value, onChange, placeholder = 'Write something…', ariaLabel }: RichTextEditorProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        class:
          'prose prose-sm min-h-full max-w-none break-words p-3 text-slate-700 focus:outline-none dark:prose-invert dark:text-slate-200 [&_a]:cursor-pointer [&_li]:my-0.5 [&_li>p]:my-0 [&_pre]:overflow-x-auto [&_strong]:text-inherit',
      },
      handleClick: (_view, _pos, event) => {
        const anchor = (event.target as HTMLElement).closest('a')
        if (!anchor || !(event.ctrlKey || event.metaKey)) return false
        window.open(anchor.href, '_blank', 'noopener,noreferrer')
        return true
      },
    },
    onUpdate: ({ editor: instance }) => onChangeRef.current(instance.isEmpty ? '' : instance.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const live = instance && !instance.isDestroyed ? instance : null
      return {
        bold: live?.isActive('bold') ?? false,
        italic: live?.isActive('italic') ?? false,
        underline: live?.isActive('underline') ?? false,
        bulletList: live?.isActive('bulletList') ?? false,
        orderedList: live?.isActive('orderedList') ?? false,
        color: (live?.getAttributes('textStyle').color as string | undefined) ?? null,
      }
    },
  })

  const onResizePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = height
    const move = (ev: PointerEvent) => setHeight(Math.max(MIN_HEIGHT, startHeight + (ev.clientY - startY)))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  if (!editor) return null

  const actions: { title: string; icon: Icon; active: boolean; run: () => void }[] = [
    { title: 'Bold (Ctrl+B)', icon: TextB, active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { title: 'Italic (Ctrl+I)', icon: TextItalic, active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    {
      title: 'Underline (Ctrl+U)',
      icon: TextUnderline,
      active: state.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      title: 'Bullet list',
      icon: ListBullets,
      active: state.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered list',
      icon: ListNumbers,
      active: state.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ]

  const applyColor = (hex: string) => {
    editor.chain().focus().setColor(hex).run()
    setShowColorPicker(false)
  }

  const resetColor = () => {
    editor.chain().focus().unsetColor().run()
    setShowColorPicker(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 transition focus-within:border-indigo-300 dark:border-slate-700 dark:focus-within:border-indigo-500/50">
      <div className="relative flex items-center gap-0.5 border-b border-slate-200 p-1 dark:border-slate-700">
        {actions.map(({ title, icon: Icon, active, run }) => (
          <button
            key={title}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={run}
            title={title}
            aria-label={title}
            aria-pressed={active}
            className={toolbarButtonClass(active)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowColorPicker((v) => !v)}
          title="Text color"
          aria-label="Text color"
          aria-expanded={showColorPicker}
          className={`${toolbarButtonClass(showColorPicker)} flex-col text-xs font-semibold leading-none`}
        >
          A
          <span
            className="mt-0.5 h-1 w-3.5 rounded-sm"
            style={{
              background: state.color ?? 'linear-gradient(to right, #ef4444, #10b981, #6366f1)',
            }}
          />
        </button>

        {showColorPicker && (
          <>
            <div className="fixed inset-0 z-[5]" onClick={() => setShowColorPicker(false)} aria-hidden="true" />
            <TextColorPicker
              className="left-0"
              initialColor={state.color}
              onPick={applyColor}
              onReset={resetColor}
            />
          </>
        )}
      </div>

      <div className="relative">
        <div
          className="nice-scrollbar cursor-text overflow-y-auto"
          style={{ height }}
          onClick={(e) => {
            if (e.target === e.currentTarget) editor.chain().focus('end').run()
          }}
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
        <div
          onPointerDown={onResizePointerDown}
          className="absolute bottom-0.5 right-0.5 h-4 w-4 touch-none cursor-ns-resize text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500"
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" className="h-full w-full">
            <path d="M13 3 3 13M13 8 8 13M13 13 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
