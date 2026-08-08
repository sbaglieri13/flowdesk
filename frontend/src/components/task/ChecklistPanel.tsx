import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { checklistApi } from '../../api/checklist'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import type { ChecklistItem } from '../../types'
import { Button } from '../ui/button'

interface ChecklistPanelProps {
  taskId: number
  items: ChecklistItem[]
  onItemsChange: (items: ChecklistItem[]) => void
}

const GENERIC_ERROR = 'Could not update the checklist. Please try again.'

export function ChecklistPanel({ taskId, items, onItemsChange }: ChecklistPanelProps) {
  const [newText, setNewText] = useState('')
  const { error, setError, run: runOrReportError } = useAsyncAction(GENERIC_ERROR)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  // Escape sets this so the blur it triggers is treated as a cancel rather
  // than a save — keeps a single commit path (the blur handler) instead of
  // two that could both try to save the same edit.
  const editCancelledRef = useRef(false)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(timer)
  }, [error, setError])

  const doneCount = items.filter((i) => i.is_done).length
  const progress = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)

  const handleAdd = () =>
    runOrReportError(async () => {
      if (!newText.trim()) return
      const item = await checklistApi.create(taskId, newText.trim())
      onItemsChange([...items, item])
      setNewText('')
    })

  const handleToggle = (itemId: number) =>
    runOrReportError(async () => {
      const updated = await checklistApi.toggle(taskId, itemId)
      onItemsChange(items.map((i) => (i.id === itemId ? updated : i)))
    })

  const handleDelete = (itemId: number) =>
    runOrReportError(async () => {
      await checklistApi.remove(taskId, itemId)
      onItemsChange(items.filter((i) => i.id !== itemId))
    })

  const handleMove = (index: number, direction: -1 | 1) =>
    runOrReportError(async () => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= items.length) return
      const reordered = [...items]
      ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
      onItemsChange(reordered)
      await checklistApi.reorder(
        taskId,
        reordered.map((i) => i.id),
      )
    })

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const commitEdit = (item: ChecklistItem) =>
    runOrReportError(async () => {
      setEditingId(null)
      const trimmed = editText.trim()
      if (!trimmed || trimmed === item.text) return
      const updated = await checklistApi.update(taskId, item.id, { text: trimmed })
      onItemsChange(items.map((i) => (i.id === item.id ? updated : i)))
    })

  const handleEditBlur = (item: ChecklistItem) => {
    if (editCancelledRef.current) {
      editCancelledRef.current = false
      return
    }
    commitEdit(item)
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.blur() // commits via handleEditBlur
    } else if (e.key === 'Escape') {
      editCancelledRef.current = true
      setEditingId(null)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {doneCount}/{items.length}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              onChange={() => handleToggle(item.id)}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            {editingId === item.id ? (
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={() => handleEditBlur(item)}
                onFocus={(e) => e.target.select()}
                rows={2}
                className="flex-1 resize-y rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-200"
              />
            ) : (
              <span
                onClick={() => startEdit(item)}
                title="Click to edit"
                className={`flex-1 cursor-text whitespace-pre-wrap break-words text-sm ${item.is_done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}
              >
                {item.text}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => startEdit(item)}
              aria-label="Edit item"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleMove(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleMove(index, 1)}
              disabled={index === items.length - 1}
              aria-label="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              onClick={() => handleDelete(item.id)}
              aria-label="Delete item"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
        </p>
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
