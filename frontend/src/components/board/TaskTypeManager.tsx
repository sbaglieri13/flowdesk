import { Eye, EyeSlash, Lock, Plus, Shapes, Trash, Warning } from '../../icons/phosphor'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { taskTypesApi } from '../../api/taskTypes'
import { suggestedColor } from '../../icons/catalog'
import { useBoardData } from '../../state/useBoardData'
import type { TaskType } from '../../types'
import { TAG_SWATCHES } from '../../utils/tagColors'
import { ColorChip } from '../common/ColorChip'
import { ColorSwatches } from '../common/ColorSwatches'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { IconPicker } from '../common/IconPicker'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

const DEFAULT_ICON = 'clipboard-text'

interface TaskTypeManagerProps {
  onClose: () => void
}

const nameInputClass =
  'min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
const fieldLabelClass = 'w-12 shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500'

export function TaskTypeManager({ onClose }: TaskTypeManagerProps) {
  const { taskTypes, refreshTaskTypes } = useBoardData()
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(DEFAULT_ICON)
  const [newColor, setNewColor] = useState(TAG_SWATCHES[0])
  const [createError, setCreateError] = useState<string | null>(null)
  const [renameErrors, setRenameErrors] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<TaskType | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await taskTypesApi.create(newName.trim(), newIcon, newColor)
      setNewName('')
      setNewIcon(DEFAULT_ICON)
      await refreshTaskTypes()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create task type. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRename = async (taskType: TaskType, name: string) => {
    if (!name.trim() || name === taskType.name) return
    setRenameErrors((prev) => ({ ...prev, [taskType.id]: '' }))
    try {
      await taskTypesApi.update(taskType.id, { name: name.trim() })
      await refreshTaskTypes()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [taskType.id]: err instanceof ApiError ? err.message : 'Could not rename task type.',
      }))
    }
  }

  const handleReicon = async (taskType: TaskType, icon: string) => {
    if (icon === taskType.icon) return
    try {
      await taskTypesApi.update(taskType.id, { icon })
      await refreshTaskTypes()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [taskType.id]: err instanceof ApiError ? err.message : 'Could not update the icon.',
      }))
    }
  }

  const handleRecolor = async (taskType: TaskType, color: string) => {
    if (color === taskType.color) return
    try {
      await taskTypesApi.update(taskType.id, { color })
      await refreshTaskTypes()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [taskType.id]: err instanceof ApiError ? err.message : 'Could not recolor task type.',
      }))
    }
  }

  const handleToggleHidden = async (taskType: TaskType) => {
    try {
      await taskTypesApi.update(taskType.id, { is_hidden: !taskType.is_hidden })
      await refreshTaskTypes()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [taskType.id]: err instanceof ApiError ? err.message : 'Could not change visibility.',
      }))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await taskTypesApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refreshTaskTypes()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this task type. Please try again.')
      setPendingDelete(null)
    }
  }

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage task types" disableEscape={pendingDelete !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Shapes className="h-4 w-4 text-indigo-500" /> Manage task types
          </h3>
        </div>
        <p className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          Recolor, change icons, or add task types. <Lock className="inline h-3 w-3" /> Default ones can
          be hidden but not renamed or deleted.
        </p>
        {deleteError && (
          <p role="alert" className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Warning className="h-3.5 w-3.5 shrink-0" /> {deleteError}
          </p>
        )}

        <ul className="nice-scrollbar max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {taskTypes.map((taskType) => (
            <li key={taskType.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <ColorChip icon={taskType.icon} name={taskType.name} color={taskType.color} />
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleHidden(taskType)}
                    aria-label={taskType.is_hidden ? `Show ${taskType.name}` : `Hide ${taskType.name}`}
                    title={taskType.is_hidden ? 'Hidden — click to show' : 'Visible — click to hide'}
                  >
                    {taskType.is_hidden ? <EyeSlash className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  {taskType.is_default ? (
                    <span className="flex items-center p-1 text-slate-300 dark:text-slate-600" title="Default task type">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      onClick={() => setPendingDelete(taskType)}
                      aria-label={`Delete task type ${taskType.name}`}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={taskType.icon}
                    onChange={(icon) => handleReicon(taskType, icon)}
                    color={taskType.color}
                    label={`Icon for ${taskType.name}`}
                    disabled={taskType.is_default}
                  />
                  <input
                    defaultValue={taskType.name}
                    onBlur={(e) => handleRename(taskType, e.target.value)}
                    disabled={taskType.is_default}
                    aria-label={`Name for ${taskType.name}`}
                    className={nameInputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Color</span>
                  <ColorSwatches
                    value={taskType.color}
                    onChange={(color) => handleRecolor(taskType, color)}
                    disabled={taskType.is_default}
                  />
                </div>
              </div>
              {renameErrors[taskType.id] && <p className="mt-2 text-xs text-red-500">{renameErrors[taskType.id]}</p>}
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Plus className="h-3.5 w-3.5" /> New task type
            </span>
            <ColorChip icon={newIcon} name={newName} color={newColor} />
          </div>

          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <IconPicker
                value={newIcon}
                onChange={(icon) => {
                  setNewIcon(icon)
                  setNewColor(suggestedColor(icon) ?? newColor)
                }}
                color={newColor}
                label="Icon for new task type"
                disabled={submitting}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setCreateError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Task type name"
                disabled={submitting}
                aria-label="Name for new task type"
                className={nameInputClass}
              />
              <Button className="shrink-0" onClick={handleCreate} disabled={submitting || !newName.trim()}>
                {submitting ? 'Adding…' : 'Add'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className={fieldLabelClass}>Color</span>
              <ColorSwatches value={newColor} onChange={setNewColor} disabled={submitting} />
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
          </div>
        </div>
      </ModalBackdrop>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this task type?"
          message={`Any tasks set to "${pendingDelete.name}" will become unassigned. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
