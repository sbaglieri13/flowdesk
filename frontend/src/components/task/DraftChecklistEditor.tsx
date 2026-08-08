import { Pencil, Plus, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../ui/button'

interface DraftChecklistEditorProps {
  items: string[]
  onChange: (items: string[]) => void
}

export function DraftChecklistEditor({ items, onChange }: DraftChecklistEditorProps) {
  const [newText, setNewText] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  // See ChecklistPanel: Escape sets this so the blur it triggers is treated
  // as a cancel rather than a save.
  const editCancelledRef = useRef(false)

  const handleAdd = () => {
    if (!newText.trim()) return
    onChange([...items, newText.trim()])
    setNewText('')
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const startEdit = (index: number, text: string) => {
    setEditingIndex(index)
    setEditText(text)
  }

  const commitEdit = (index: number) => {
    setEditingIndex(null)
    const trimmed = editText.trim()
    if (!trimmed) return
    onChange(items.map((t, i) => (i === index ? trimmed : t)))
  }

  const handleEditBlur = (index: number) => {
    if (editCancelledRef.current) {
      editCancelledRef.current = false
      return
    }
    commitEdit(index)
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.blur() // commits via handleEditBlur
    } else if (e.key === 'Escape') {
      editCancelledRef.current = true
      setEditingIndex(null)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((text, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <span className="h-4 w-4 shrink-0 rounded border border-slate-300 dark:border-slate-600" />
              {editingIndex === index ? (
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={() => handleEditBlur(index)}
                  onFocus={(e) => e.target.select()}
                  rows={2}
                  className="flex-1 resize-y rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-200"
                />
              ) : (
                <span
                  onClick={() => startEdit(index, text)}
                  title="Click to edit"
                  className="flex-1 cursor-text whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200"
                >
                  {text}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => startEdit(index, text)}
                aria-label="Edit item"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                onClick={() => handleRemove(index)}
                aria-label="Remove item"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAdd()
            }
          }}
          rows={2}
          placeholder="Add checklist item... (Shift+Enter for a new line)"
          className="flex-1 resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <Button variant="outline" className="shrink-0" onClick={handleAdd}>
          <Plus className="h-4 w-4" strokeWidth={2} /> Add
        </Button>
      </div>
    </div>
  )
}
