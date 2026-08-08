import { AlertTriangle, Eye, EyeOff, Flag, Lock, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { prioritiesApi } from '../../api/priorities'
import { useBoardData } from '../../state/BoardContext'
import type { Priority } from '../../types'
import { TAG_SWATCHES } from '../../utils/tagColors'
import { ColorChip } from '../common/ColorChip'
import { ColorSwatches } from '../common/ColorSwatches'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { EmojiSuggestionGrid } from '../common/EmojiSuggestionGrid'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

interface PriorityManagerProps {
  onClose: () => void
}

const emojiInputClass =
  'w-11 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-center text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800'
const nameInputClass =
  'min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
const fieldLabelClass = 'w-12 shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500'

export function PriorityManager({ onClose }: PriorityManagerProps) {
  const { priorities, refreshPriorities } = useBoardData()
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newColor, setNewColor] = useState(TAG_SWATCHES[0])
  const [createError, setCreateError] = useState<string | null>(null)
  const [renameErrors, setRenameErrors] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Priority | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || !newEmoji || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await prioritiesApi.create(newName.trim(), newEmoji, newColor)
      setNewName('')
      setNewEmoji('')
      await refreshPriorities()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create priority. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRename = async (priority: Priority, name: string) => {
    if (!name.trim() || name === priority.name) return
    setRenameErrors((prev) => ({ ...prev, [priority.id]: '' }))
    try {
      await prioritiesApi.update(priority.id, { name: name.trim() })
      await refreshPriorities()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [priority.id]: err instanceof ApiError ? err.message : 'Could not rename priority.',
      }))
    }
  }

  const handleReemoji = async (priority: Priority, emoji: string) => {
    if (!emoji || emoji === priority.emoji) return
    try {
      await prioritiesApi.update(priority.id, { emoji })
      await refreshPriorities()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [priority.id]: err instanceof ApiError ? err.message : 'Could not update emoji.',
      }))
    }
  }

  const handleRecolor = async (priority: Priority, color: string) => {
    if (color === priority.color) return
    try {
      await prioritiesApi.update(priority.id, { color })
      await refreshPriorities()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [priority.id]: err instanceof ApiError ? err.message : 'Could not recolor priority.',
      }))
    }
  }

  const handleToggleHidden = async (priority: Priority) => {
    try {
      await prioritiesApi.update(priority.id, { is_hidden: !priority.is_hidden })
      await refreshPriorities()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [priority.id]: err instanceof ApiError ? err.message : 'Could not change visibility.',
      }))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await prioritiesApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refreshPriorities()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this priority. Please try again.')
      setPendingDelete(null)
    }
  }

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage priorities" disableEscape={pendingDelete !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Flag className="h-4 w-4 text-indigo-500" strokeWidth={2} /> Manage priorities
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
        <p className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          Reorder, recolor, or add priorities. <Lock className="inline h-3 w-3" strokeWidth={2} /> Default ones can be
          hidden but not renamed or deleted.
        </p>
        {deleteError && (
          <p role="alert" className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {deleteError}
          </p>
        )}

        <ul className="nice-scrollbar max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {priorities.map((priority) => (
            <li key={priority.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <ColorChip emoji={priority.emoji} name={priority.name} color={priority.color} />
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleHidden(priority)}
                    aria-label={priority.is_hidden ? `Show ${priority.name}` : `Hide ${priority.name}`}
                    title={priority.is_hidden ? 'Hidden — click to show' : 'Visible — click to hide'}
                  >
                    {priority.is_hidden ? <EyeOff className="h-3.5 w-3.5" strokeWidth={2} /> : <Eye className="h-3.5 w-3.5" strokeWidth={2} />}
                  </Button>
                  {priority.is_default ? (
                    <span className="flex items-center p-1 text-slate-300 dark:text-slate-600" title="Default priority">
                      <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      onClick={() => setPendingDelete(priority)}
                      aria-label={`Delete priority ${priority.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    defaultValue={priority.emoji}
                    onBlur={(e) => handleReemoji(priority, e.target.value)}
                    disabled={priority.is_default}
                    maxLength={8}
                    aria-label={`Emoji for ${priority.name}`}
                    className={emojiInputClass}
                  />
                  <input
                    defaultValue={priority.name}
                    onBlur={(e) => handleRename(priority, e.target.value)}
                    disabled={priority.is_default}
                    aria-label={`Name for ${priority.name}`}
                    className={nameInputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Color</span>
                  <ColorSwatches
                    value={priority.color}
                    onChange={(color) => handleRecolor(priority, color)}
                    disabled={priority.is_default}
                  />
                </div>
              </div>
              {renameErrors[priority.id] && <p className="mt-2 text-xs text-red-500">{renameErrors[priority.id]}</p>}
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> New priority
            </span>
            <ColorChip emoji={newEmoji} name={newName} color={newColor} />
          </div>

          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                maxLength={8}
                placeholder="🙂"
                disabled={submitting}
                aria-label="Emoji for new priority"
                className={emojiInputClass}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setCreateError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Priority name"
                disabled={submitting}
                aria-label="Name for new priority"
                className={nameInputClass}
              />
              <Button className="shrink-0" onClick={handleCreate} disabled={submitting || !newName.trim() || !newEmoji}>
                {submitting ? 'Adding…' : 'Add'}
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <span className={`${fieldLabelClass} pt-1.5`}>Emoji</span>
              <EmojiSuggestionGrid value={newEmoji} onSelect={setNewEmoji} disabled={submitting} />
            </div>
            <div className="flex items-center gap-2">
              <span className={fieldLabelClass}>Color</span>
              <ColorSwatches value={newColor} onChange={setNewColor} disabled={submitting} />
            </div>
            {!newEmoji && newName.trim() && <p className="text-xs text-slate-400">Pick an emoji to finish.</p>}
            {createError && <p className="text-xs text-red-500">{createError}</p>}
          </div>
        </div>
      </ModalBackdrop>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this priority?"
          message={`Any tasks set to "${pendingDelete.name}" will move to "Medium". This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
