import { CaretDown, CaretUp, CheckCircle, Circle, Eye, EyeSlash, Lock, Plus, SlidersHorizontal, Warning, X } from '../../icons/phosphor'
import { useState } from 'react'
import { columnsApi } from '../../api/columns'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useBoardData } from '../../state/useBoardData'
import type { BoardColumn } from '../../types'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { columnAccentColor, guessColumnIcon } from '../../utils/columnStyle'
import { IconPicker } from '../common/IconPicker'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

interface ColumnManagerProps {
  onClose: () => void
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

export function ColumnManager({ onClose }: ColumnManagerProps) {
  const { columns, refreshColumns } = useBoardData()
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BoardColumn | null>(null)
  const { error, run: runOrReportError } = useAsyncAction(GENERIC_ERROR)

  const handleRename = (id: number, name: string) => runOrReportError(() => columnsApi.update(id, { name }).then(refreshColumns))

  const handleReicon = (id: number, icon: string) => runOrReportError(() => columnsApi.update(id, { icon }).then(refreshColumns))

  const handleToggleHidden = (column: BoardColumn) =>
    runOrReportError(() => columnsApi.update(column.id, { is_hidden: !column.is_hidden }).then(refreshColumns))

  const handleToggleDoneState = (column: BoardColumn) =>
    runOrReportError(() =>
      columnsApi.update(column.id, { is_done_state: !column.is_done_state }).then(refreshColumns),
    )

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
      await columnsApi.create(newName.trim(), newIcon ?? undefined)
      setNewName('')
      setNewIcon(null)
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
            <SlidersHorizontal className="h-4 w-4 text-indigo-500" /> Manage columns
          </h3>
        </div>
        <p className="mb-3 flex items-start gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Reorder, rename, or change the icon of any column.
            <Lock className="mx-1 inline h-3 w-3 align-baseline" />
            Default columns can be hidden from the board but not renamed or deleted. Mark a column as
            "counts as done" to have tasks moved into it count toward the closed-tasks statistics.
          </span>
        </p>
        {error && (
          <p role="alert" className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Warning className="h-3.5 w-3.5 shrink-0" /> {error}
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
                    <CaretUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === columns.length - 1}
                    aria-label="Move down"
                  >
                    <CaretDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <IconPicker
                  value={column.icon || guessColumnIcon(column.name)}
                  onChange={(icon) => handleReicon(column.id, icon)}
                  color={columnAccentColor(column.position)}
                  label={`Icon for ${column.name}`}
                  disabled={column.is_default}
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
                  onClick={() => handleToggleDoneState(column)}
                  aria-label={
                    column.is_done_state
                      ? `Stop counting ${column.name} as done`
                      : `Count ${column.name} as done`
                  }
                  title={column.is_done_state ? 'Counts as done — click to unmark' : 'Mark as "counts as done"'}
                  className={column.is_done_state ? 'text-emerald-500 hover:text-emerald-600' : ''}
                >
                  {column.is_done_state ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleHidden(column)}
                  aria-label={column.is_hidden ? `Show ${column.name} on the board` : `Hide ${column.name} from the board`}
                  title={column.is_hidden ? 'Hidden from board — click to show' : 'Visible on board — click to hide'}
                >
                  {column.is_hidden ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                {column.is_default ? (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-300 dark:text-slate-600"
                    title="Default column"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    onClick={() => setPendingDelete(column)}
                    aria-label={`Delete column ${column.name}`}
                  >
                    <X className="h-4 w-4" />
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
            <IconPicker
              value={newIcon ?? guessColumnIcon(newName)}
              onChange={setNewIcon}
              color={columnAccentColor(columns.length)}
              label="Icon for new column"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Column name"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button className="shrink-0" onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
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
