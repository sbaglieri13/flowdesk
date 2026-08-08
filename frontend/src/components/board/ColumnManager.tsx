import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Lock, Plus, Settings2, X } from 'lucide-react'
import { useState } from 'react'
import { columnsApi } from '../../api/columns'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useBoardData } from '../../state/BoardContext'
import type { BoardColumn } from '../../types'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { EmojiPicker } from '../common/EmojiPicker'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

interface ColumnManagerProps {
  onClose: () => void
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

export function ColumnManager({ onClose }: ColumnManagerProps) {
  const { columns, refreshColumns } = useBoardData()
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [pendingDelete, setPendingDelete] = useState<BoardColumn | null>(null)
  const { error, run: runOrReportError } = useAsyncAction(GENERIC_ERROR)

  const handleRename = (id: number, name: string) => runOrReportError(() => columnsApi.update(id, { name }).then(refreshColumns))

  const handleReemoji = (id: number, emoji: string) => runOrReportError(() => columnsApi.update(id, { emoji }).then(refreshColumns))

  const handleToggleHidden = (column: BoardColumn) =>
    runOrReportError(() => columnsApi.update(column.id, { is_hidden: !column.is_hidden }).then(refreshColumns))

  const handleMove = (index: number, direction: -1 | 1) =>
    runOrReportError(async () => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= columns.length) return
      const reordered = [...columns]
      ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
      await columnsApi.reorder(reordered.map((c, i) => ({ id: c.id, position: i })))
      await refreshColumns()
    })

  const handleAdd = () =>
    runOrReportError(async () => {
      if (!newName.trim()) return
      await columnsApi.create(newName.trim(), newEmoji || undefined)
      setNewName('')
      setNewEmoji('')
      await refreshColumns()
    })

  const handleDelete = () =>
    runOrReportError(async () => {
      if (!pendingDelete) return
      await columnsApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refreshColumns()
    })

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage columns" disableEscape={pendingDelete !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Settings2 className="h-4 w-4 text-indigo-500" strokeWidth={2} /> Manage columns
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
        <p className="mb-3 flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Reorder, rename, or re-emoji any column.
            <Lock className="mx-1 inline h-3 w-3 align-baseline" strokeWidth={2} />
            Default columns can be hidden from the board but not renamed or deleted.
          </span>
        </p>
        {error && (
          <p role="alert" className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
          </p>
        )}

        <ul className="nice-scrollbar max-h-96 space-y-2 overflow-y-auto pr-1">
          {columns.map((column, index) => (
            <li key={column.id} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === columns.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </Button>
                </div>

                <input
                  defaultValue={column.emoji ?? ''}
                  onBlur={(e) => e.target.value !== (column.emoji ?? '') && handleReemoji(column.id, e.target.value)}
                  disabled={column.is_default}
                  maxLength={8}
                  placeholder="🙂"
                  aria-label={`Emoji for ${column.name}`}
                  className="w-11 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-center text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  defaultValue={column.name}
                  disabled={column.is_default}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== column.name && handleRename(column.id, e.target.value.trim())}
                  aria-label={`Name for ${column.name}`}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleHidden(column)}
                  aria-label={column.is_hidden ? `Show ${column.name} on the board` : `Hide ${column.name} from the board`}
                  title={column.is_hidden ? 'Hidden from board — click to show' : 'Visible on board — click to hide'}
                >
                  {column.is_hidden ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                </Button>

                {column.is_default ? (
                  <span className="flex shrink-0 items-center p-1.5 text-slate-300 dark:text-slate-600" title="Default column">
                    <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    onClick={() => setPendingDelete(column)}
                    aria-label={`Delete column ${column.name}`}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </Button>
                )}
              </div>

              {column.is_hidden && (
                <p className="mt-1.5 pl-[4.75rem] text-xs text-amber-600 dark:text-amber-400">
                  Hidden from the board — its tasks aren't shown until you make it visible again.
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">New column</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Column name"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button className="shrink-0" onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Add
            </Button>
          </div>
          <div className="mt-2">
            <EmojiPicker value={newEmoji} onChange={setNewEmoji} />
          </div>
        </div>
      </ModalBackdrop>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this column?"
          message={`Any tasks in "${pendingDelete.name}" will move to the "New" column. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
