import { Plus, Tag as TagIcon, Trash, Warning } from '../../icons/phosphor'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { tagsApi } from '../../api/tags'
import { suggestedColor } from '../../icons/catalog'
import { useBoardData } from '../../state/useBoardData'
import type { Tag } from '../../types'
import { TAG_SWATCHES } from '../../utils/tagColors'
import { ColorChip } from '../common/ColorChip'
import { ColorSwatches } from '../common/ColorSwatches'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { IconPicker } from '../common/IconPicker'
import { ModalBackdrop } from '../common/ModalBackdrop'
import { Button } from '../ui/button'

const DEFAULT_ICON = 'tag'

interface TagManagerProps {
  onClose: () => void
}

const nameInputClass =
  'min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
const fieldLabelClass = 'w-12 shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500'

export function TagManager({ onClose }: TagManagerProps) {
  const { tags, refreshTags } = useBoardData()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_SWATCHES[0])
  const [newIcon, setNewIcon] = useState(DEFAULT_ICON)
  const [createError, setCreateError] = useState<string | null>(null)
  const [renameErrors, setRenameErrors] = useState<Record<number, string>>({})
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await tagsApi.create(newName.trim(), newColor, newIcon)
      setNewName('')
      setNewIcon(DEFAULT_ICON)
      await refreshTags()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create tag. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRename = async (tag: Tag, name: string) => {
    if (!name.trim() || name === tag.name) return
    setRenameErrors((prev) => ({ ...prev, [tag.id]: '' }))
    try {
      await tagsApi.update(tag.id, { name: name.trim() })
      await refreshTags()
    } catch (err) {
      setRenameErrors((prev) => ({
        ...prev,
        [tag.id]: err instanceof ApiError ? err.message : 'Could not rename tag.',
      }))
    }
  }

  const handleRecolor = async (tag: Tag, color: string) => {
    if (color === tag.color) return
    try {
      await tagsApi.update(tag.id, { color })
      await refreshTags()
    } catch (err) {
      setRenameErrors((prev) => ({ ...prev, [tag.id]: err instanceof ApiError ? err.message : 'Could not recolor tag.' }))
    }
  }

  const handleReicon = async (tag: Tag, icon: string) => {
    if (icon === tag.icon) return
    try {
      await tagsApi.update(tag.id, { icon })
      await refreshTags()
    } catch (err) {
      setRenameErrors((prev) => ({ ...prev, [tag.id]: err instanceof ApiError ? err.message : 'Could not update the icon.' }))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await tagsApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refreshTags()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this tag. Please try again.')
      setPendingDelete(null)
    }
  }

  return (
    <>
      <ModalBackdrop onClose={onClose} title="Manage tags" disableEscape={pendingDelete !== null}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <TagIcon className="h-4 w-4 text-indigo-500" /> Manage tags
          </h3>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Rename, recolor, change the icon, or remove tags used across your tasks.
        </p>
        {deleteError && (
          <p role="alert" className="mb-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Warning className="h-3.5 w-3.5 shrink-0" /> {deleteError}
          </p>
        )}

        {tags.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No tags yet — create your first one below.
          </p>
        ) : (
          <ul className="nice-scrollbar max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <li key={tag.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <ColorChip icon={tag.icon} name={tag.name} color={tag.color} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    onClick={() => setPendingDelete(tag)}
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <IconPicker
                      value={tag.icon}
                      onChange={(icon) => handleReicon(tag, icon)}
                      color={tag.color}
                      label={`Icon for ${tag.name}`}
                    />
                    <input
                      defaultValue={tag.name}
                      onBlur={(e) => handleRename(tag, e.target.value)}
                      aria-label={`Name for ${tag.name}`}
                      className={nameInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Color</span>
                    <ColorSwatches value={tag.color} onChange={(color) => handleRecolor(tag, color)} />
                  </div>
                </div>
                {renameErrors[tag.id] && <p className="mt-2 text-xs text-red-500">{renameErrors[tag.id]}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Plus className="h-3.5 w-3.5" /> New tag
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
                label="Icon for new tag"
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
                placeholder="Tag name"
                disabled={submitting}
                aria-label="Name for new tag"
                className={`${nameInputClass} disabled:opacity-60`}
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
          title="Delete this tag?"
          message={`"${pendingDelete.name}" will be removed from every task that uses it. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
