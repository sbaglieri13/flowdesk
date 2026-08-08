import { AlertTriangle, CheckSquare, Link2, Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { tagsApi } from '../../api/tags'
import { tasksApi } from '../../api/tasks'
import { useBoardData } from '../../state/BoardContext'
import type { Task } from '../../types'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FloatingWindow } from '../common/FloatingWindow'
import { Button } from '../ui/button'
import { AttachmentsPanel } from './AttachmentsPanel'
import { ChecklistPanel } from './ChecklistPanel'
import { DescriptionNotesFields } from './DescriptionNotesFields'
import { PriorityDeadlineFields } from './PriorityDeadlineFields'
import { TaskFormSection } from './TaskFormSection'
import { TaskTagsField } from './TaskTagsField'

interface TaskModalProps {
  task: Task
  onClose: () => void
  onUpdated: (task: Task) => void
  onDeleted: (taskId: number) => void
}

const GENERIC_SAVE_ERROR = 'Could not save your change. Please try again.'

export function TaskModal({ task, onClose, onUpdated, onDeleted }: TaskModalProps) {
  const { tags, priorities, settings, refreshTags } = useBoardData()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [activeSection, setActiveSection] = useState<'description' | 'notes'>('description')
  const [externalReference, setExternalReference] = useState(task.external_reference ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [current, setCurrent] = useState(task)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const apply = async (payload: Parameters<typeof tasksApi.update>[1]) => {
    setSaveError(null)
    try {
      const updated = await tasksApi.update(current.id, payload)
      setCurrent(updated)
      onUpdated(updated)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : GENERIC_SAVE_ERROR)
    }
  }

  const handleCreateTag = async (name: string, color: string, emoji: string) => {
    await tagsApi.create(name, color, emoji || undefined)
    await refreshTags()
  }

  const handleToggleTag = async (tagId: number) => {
    const has = current.tags.some((t) => t.id === tagId)
    const nextIds = has ? current.tags.filter((t) => t.id !== tagId).map((t) => t.id) : [...current.tags.map((t) => t.id), tagId]
    await apply({ tag_ids: nextIds })
  }

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await tasksApi.remove(current.id)
      onDeleted(current.id)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this task. Please try again.')
      setConfirmingDelete(false)
    }
  }

  const externalUrl =
    settings.external_reference_base_url && current.external_reference
      ? `${settings.external_reference_base_url.replace(/\/$/, '')}/${current.external_reference}`
      : null

  const header = (
    <>
      <span className="text-xs font-mono font-semibold text-indigo-500">{current.display_code}</span>
      <input
        id="task-modal-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== current.title && apply({ title: title.trim() })}
        className="mt-0.5 w-full bg-transparent text-lg font-semibold text-slate-900 focus:outline-none dark:text-slate-100"
      />
    </>
  )

  const footer = (
    <>
      {deleteError && (
        <p role="alert" className="mb-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {deleteError}
        </p>
      )}
      <div className="flex justify-between">
        <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
          <Trash2 className="h-4 w-4" strokeWidth={2} /> Delete task
        </Button>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  )

  return (
    <>
      <FloatingWindow onClose={onClose} header={header} footer={footer} ariaLabel="Task details" disableEscape={confirmingDelete}>
        <div className="space-y-3">
          {saveError && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {saveError}
            </p>
          )}

          <TaskFormSection>
            <PriorityDeadlineFields
              priorityId={current.priority.id}
              onPriorityChange={(priorityId) => apply({ priority_id: priorityId })}
              priorities={priorities}
              deadline={current.deadline}
              onDeadlineChange={(deadline) => apply({ deadline })}
            />
          </TaskFormSection>

          <TaskFormSection>
            <DescriptionNotesFields
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              description={description}
              onDescriptionChange={setDescription}
              notes={notes}
              onNotesChange={setNotes}
              defaultMode="preview"
              renderSaveButton={(section) => {
                const dirty = section === 'description' ? description !== (current.description ?? '') : notes !== (current.notes ?? '')
                if (!dirty) return null
                return (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => apply(section === 'description' ? { description } : { notes })}
                  >
                    Save {section}
                  </Button>
                )
              }}
            />
          </TaskFormSection>

          <TaskFormSection>
            <TaskTagsField
              allTags={tags}
              selectedIds={current.tags.map((t) => t.id)}
              onToggle={handleToggleTag}
              onCreateTag={handleCreateTag}
            />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <CheckSquare className="h-3.5 w-3.5" strokeWidth={2} /> Checklist
            </label>
            <ChecklistPanel
              taskId={current.id}
              items={current.checklist_items}
              onItemsChange={(items) => {
                const updated = { ...current, checklist_items: items }
                setCurrent(updated)
                onUpdated(updated)
              }}
            />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Paperclip className="h-3.5 w-3.5" strokeWidth={2} /> Attachments
            </label>
            <AttachmentsPanel
              taskId={current.id}
              items={current.attachments ?? []}
              onItemsChange={(attachments) => {
                const updated = { ...current, attachments }
                setCurrent(updated)
                onUpdated(updated)
              }}
            />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Link2 className="h-3.5 w-3.5" strokeWidth={2} /> External reference
            </label>
            <input
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              onBlur={() =>
                externalReference !== (current.external_reference ?? '') &&
                apply({ external_reference: externalReference || null })
              }
              placeholder="e.g. PROJ-123"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
            />
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-indigo-500 hover:underline"
              >
                {externalUrl}
              </a>
            )}
          </TaskFormSection>
        </div>
      </FloatingWindow>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message="This permanently removes the task and its checklist. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
