import { Broom, Check, MagnifyingGlass, PencilSimple, Plus, Trash, User, Warning, X } from '../../icons/phosphor'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { reportersApi } from '../../api/reporters'
import { useBoardData } from '../../state/useBoardData'
import type { Reporter } from '../../types'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

interface ReporterManagerProps {
  onClose: () => void
  onTasksChanged?: () => void
}

const MAX_NAME_LENGTH = 100
const SEARCH_THRESHOLD = 8

const taskCount = (reporter: Reporter) => reporter.task_count ?? 0
const formatTasks = (count: number) => `${count} ${count === 1 ? 'task' : 'tasks'}`
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function ReporterManager({ onClose, onTasksChanged }: ReporterManagerProps) {
  const { reporters, refreshReporters } = useBoardData()
  useEffect(() => {
    refreshReporters().catch(() => {})
  }, [refreshReporters])

  const newNameRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [pendingDelete, setPendingDelete] = useState<Reporter | null>(null)
  const [pendingCleanup, setPendingCleanup] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const unused = useMemo(() => reporters.filter((r) => taskCount(r) === 0), [reporters])
  const maxCount = useMemo(() => Math.max(1, ...reporters.map(taskCount)), [reporters])
  const visible = useMemo(
    () => (query.trim() ? reporters.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase())) : reporters),
    [reporters, query],
  )
  const duplicateNew = newName.trim() !== '' && reporters.some((r) => sameName(r.name, newName))
  const blockingDialog = pendingDelete !== null || pendingCleanup

  const setRowError = (id: number, message: string) => setRowErrors((prev) => ({ ...prev, [id]: message }))

  const handleCreate = async () => {
    if (!newName.trim() || duplicateNew || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await reportersApi.create(newName.trim())
      setNewName('')
      await refreshReporters()
      newNameRef.current?.focus()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not add reporter. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (reporter: Reporter) => {
    setEditingId(reporter.id)
    setEditName(reporter.name)
    setRowError(reporter.id, '')
  }

  const cancelEdit = () => setEditingId(null)

  const commitEdit = async (reporter: Reporter) => {
    const name = editName.trim()
    if (!name || name === reporter.name) {
      cancelEdit()
      return
    }
    if (reporters.some((r) => r.id !== reporter.id && sameName(r.name, name))) {
      setRowError(reporter.id, 'A reporter with this name already exists')
      return
    }
    try {
      await reportersApi.update(reporter.id, name)
      cancelEdit()
      await refreshReporters()
      onTasksChanged?.()
    } catch (err) {
      setRowError(reporter.id, err instanceof ApiError ? err.message : 'Could not rename reporter.')
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const reporter = pendingDelete
    setPendingDelete(null)
    setActionError(null)
    try {
      await reportersApi.remove(reporter.id)
      await refreshReporters()
      onTasksChanged?.()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete this reporter. Please try again.')
    }
  }

  const handleCleanup = async () => {
    setPendingCleanup(false)
    setActionError(null)
    try {
      for (const reporter of unused) await reportersApi.remove(reporter.id)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete unused reporters. Please try again.')
    } finally {
      await refreshReporters()
    }
  }

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage reporters" disableEscape={blockingDialog || editingId !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <User className="h-4 w-4 text-indigo-500" /> Manage reporters
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">{reporters.length} total</span>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Rename or remove reporters. A task has at most one reporter, and you can also add a new one directly
          from a task's Reporter field.
        </p>
        {actionError && (
          <p role="alert" className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Warning className="h-3.5 w-3.5 shrink-0" /> {actionError}
          </p>
        )}

        {reporters.length > SEARCH_THRESHOLD && (
          <div className="relative mb-3">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reporters"
              aria-label="Search reporters"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        {reporters.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No reporters yet — add your first one below.
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No reporter matches "{query}".
          </p>
        ) : (
          <ul className="nice-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
            {visible.map((reporter) => {
              const count = taskCount(reporter)
              const isEditing = editingId === reporter.id
              return (
                <li key={reporter.id} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        count === 0
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500'
                          : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300'
                      }`}
                    >
                      <User className="h-4 w-4" />
                    </span>

                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        maxLength={MAX_NAME_LENGTH}
                        onChange={(e) => {
                          setEditName(e.target.value)
                          setRowError(reporter.id, '')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(reporter)
                          if (e.key === 'Escape') {
                            e.stopPropagation()
                            cancelEdit()
                          }
                        }}
                        aria-label={`New name for ${reporter.name}`}
                        className="min-w-0 flex-1 rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm dark:border-indigo-500/60 dark:bg-slate-800 dark:text-slate-200"
                      />
                    ) : (
                      <button
                        type="button"
                        onDoubleClick={() => startEdit(reporter)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-slate-800 dark:text-slate-200"
                        title={reporter.name}
                      >
                        {reporter.name}
                      </button>
                    )}

                    <span className="flex w-16 shrink-0 flex-col items-end gap-0.5">
                      <span className={`text-xs ${count === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatTasks(count)}
                      </span>
                      <span className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-indigo-400"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </span>
                    </span>

                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                          onClick={() => commitEdit(reporter)}
                          aria-label="Save name"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit} aria-label="Cancel rename">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => startEdit(reporter)}
                          aria-label={`Rename reporter ${reporter.name}`}
                        >
                          <PencilSimple className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          onClick={() => setPendingDelete(reporter)}
                          aria-label={`Delete reporter ${reporter.name}`}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {rowErrors[reporter.id] && <p className="mt-2 text-xs text-red-500">{rowErrors[reporter.id]}</p>}

                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input
              ref={newNameRef}
              type="text"
              value={newName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => {
                setNewName(e.target.value)
                setCreateError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="New reporter name"
              aria-label="New reporter name"
              disabled={submitting}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button className="shrink-0" onClick={handleCreate} disabled={submitting || !newName.trim() || duplicateNew}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {duplicateNew && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">This reporter already exists.</p>}
          {createError && <p className="mt-2 text-xs text-red-500">{createError}</p>}

          {unused.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {unused.length} unused {unused.length === 1 ? 'reporter' : 'reporters'}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPendingCleanup(true)}>
                <Broom className="h-3.5 w-3.5" /> Delete unused
              </Button>
            </div>
          )}
        </div>
      </ModalBackdrop>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this reporter?"
          message={
            taskCount(pendingDelete) > 0
              ? `${formatTasks(taskCount(pendingDelete))} set to "${pendingDelete.name}" will become unassigned. This cannot be undone.`
              : `"${pendingDelete.name}" has no tasks. This cannot be undone.`
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}


      {pendingCleanup && (
        <ConfirmDialog
          title="Delete unused reporters?"
          message={`${unused.length} ${unused.length === 1 ? 'reporter' : 'reporters'} with no tasks will be deleted. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleCleanup}
          onCancel={() => setPendingCleanup(false)}
        />
      )}
    </>
  )
}
