import { Eye, Pencil } from 'lucide-react'
import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { TAG_SWATCHES } from '../../utils/tagColors'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  defaultMode?: 'edit' | 'preview'
}

interface FormatAction {
  title: string
  before: string
  after: string
}

const DEFAULT_HEIGHT = 208
const MIN_HEIGHT = 120

const FORMAT_ACTIONS: (FormatAction & { label: string; style?: CSSProperties })[] = [
  { label: 'B', title: 'Bold', before: '**', after: '**', style: { fontWeight: 700 } },
  { label: 'I', title: 'Italic', before: '*', after: '*', style: { fontStyle: 'italic' } },
  { label: 'U', title: 'Underline', before: '<u>', after: '</u>', style: { textDecoration: 'underline' } },
]

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Markdown supported...',
  defaultMode = 'edit',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>(defaultMode)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyFormat = (action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    const next = `${value.slice(0, selectionStart)}${action.before}${selected}${action.after}${value.slice(selectionEnd)}`
    onChange(next)

    const cursorStart = selectionStart + action.before.length
    const cursorEnd = cursorStart + selected.length
    // Re-apply the selection after React re-renders the textarea with the new value.
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  const applyColor = (color: string) => {
    applyFormat({ title: 'Text color', before: `<span style="color: ${color}">`, after: '</span>' })
    setShowColorPicker(false)
  }

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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-1 border-b border-slate-200 p-1 dark:border-slate-700">
        <div className="flex gap-1">
          {(['edit', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                mode === tab
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'edit' ? (
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {tab}
            </button>
          ))}
        </div>

        {mode === 'edit' && (
          <div className="relative flex items-center gap-0.5 pr-1">
            {FORMAT_ACTIONS.map((action) => (
              <button
                key={action.title}
                type="button"
                // Prevents the textarea from losing its selection before the click fires.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat(action)}
                title={action.title}
                aria-label={action.title}
                style={action.style}
                className="w-6 rounded-md py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowColorPicker((v) => !v)}
              title="Text color"
              aria-label="Text color"
              aria-expanded={showColorPicker}
              className="flex w-6 flex-col items-center rounded-md py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              A
              <span className="mt-0.5 h-1 w-3.5 rounded-sm bg-gradient-to-r from-red-500 via-emerald-500 to-indigo-500" />
            </button>

            {showColorPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {TAG_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor(swatch)}
                    className="h-5 w-5 rounded-full transition hover:scale-110"
                    style={{ backgroundColor: swatch }}
                    aria-label={`Set text color ${swatch}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {mode === 'edit' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ height }}
            className="w-full resize-none bg-transparent p-3 pb-5 text-sm text-slate-700 focus:outline-none dark:text-slate-200"
          />
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
      ) : (
        <div className="prose prose-sm max-w-none overflow-x-hidden break-words p-3 text-slate-700 dark:prose-invert dark:text-slate-200 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
          {value.trim() ? (
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-slate-400 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
