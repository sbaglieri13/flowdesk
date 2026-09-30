import { AlertTriangle, Plus, Trash2, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { reportersApi } from '../../api/reporters'
import { useBoardData } from '../../state/BoardContext'
import type { Reporter } from '../../types'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

interface ReporterManagerProps {
  onClose: () => void
}

export function ReporterManager({ onClose }: ReporterManagerProps) {
  const { reporters, refreshReporters } = useBoardData()
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [renameErrors, setRenameErrors] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Reporter | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await reportersApi.create(newName.trim())
      setNewName('')
      await refreshReporters()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not add reporter. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRename = async (reporter: Reporter, name: string) => {
    if (!name.trim() || name === reporter.name) return
    setRenameErrors((prev) => ({ ...prev, [reporter.id]: '' }))
    try {
      await reportersApi.update(reporter.id, name.trim())
      await refreshReporters()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [reporter.id]: err instanceof ApiError ? err.message : 'Could not rename reporter.',
      }))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await reportersApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refreshReporters()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this reporter. Please try again.')
      setPendingDelete(null)
    }
  }

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage reporters" disableEscape={pendingDelete !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <UserRound className="h-4 w-4 text-indigo-500" strokeWidth={2} /> Manage reporters
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Rename or remove reporters. You can also add a new one directly from a task's Reporter field.
        </p>
        {deleteError && (
          <p role="alert" className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {deleteError}
          </p>
        )}

        {reporters.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No reporters yet — add your first one below.
          </p>
        ) : (
          <ul className="nice-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
            {reporters.map((reporter) => (
              <li key={reporter.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                <input
                  defaultValue={reporter.name}
                  onBlur={(e) => handleRename(reporter, e.target.value)}
                  aria-label={`Name for ${reporter.name}`}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  onClick={() => setPendingDelete(reporter)}
                  aria-label={`Delete reporter ${reporter.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </Button>
                {renameErrors[reporter.id] && (
                  <p className="mt-2 text-xs text-red-500">{renameErrors[reporter.id]}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setCreateError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New reporter name"
              disabled={submitting}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button className="shrink-0" onClick={handleCreate} disabled={submitting || !newName.trim()}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Add
            </Button>
          </div>
          {createError && <p className="mt-2 text-xs text-red-500">{createError}</p>}
        </div>
      </ModalBackdrop>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this reporter?"
          message={`Tasks set to "${pendingDelete.name}" will become unassigned. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
