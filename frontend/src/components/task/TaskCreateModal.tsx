import { AlertTriangle, CheckSquare, Link2, Paperclip, Rocket, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { attachmentsApi } from '../../api/attachments'
import { tagsApi } from '../../api/tags'
import { tasksApi } from '../../api/tasks'
import { useBoardData } from '../../state/BoardContext'
import type { Task } from '../../types'
import { FloatingWindow } from '../common/FloatingWindow'
import { Button } from '../ui/button'
import { DescriptionNotesFields } from './DescriptionNotesFields'
import { DraftAttachmentsEditor } from './DraftAttachmentsEditor'
import { DraftChecklistEditor } from './DraftChecklistEditor'
import { PriorityDeadlineFields } from './PriorityDeadlineFields'
import { TaskFormSection } from './TaskFormSection'
import { TaskTagsField } from './TaskTagsField'

interface TaskCreateModalProps {
  columnId: number
  onClose: () => void
  onCreated: (task: Task) => void
}

const GENERIC_CREATE_ERROR = 'Could not create the task. Please try again.'

export function TaskCreateModal({ columnId, onClose, onCreated }: TaskCreateModalProps) {
  const { tags, priorities, refreshTags } = useBoardData()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [activeSection, setActiveSection] = useState<'description' | 'notes'>('description')
  const defaultPriority = priorities.find((p) => p.is_default && p.name === 'Medium') ?? priorities[0]
  const [priorityId, setPriorityId] = useState<number | undefined>(defaultPriority?.id)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [externalReference, setExternalReference] = useState('')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [checklist, setChecklist] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleCreateTag = async (name: string, color: string, emoji: string) => {
    const tag = await tagsApi.create(name, color, emoji || undefined)
    await refreshTags()
    setTagIds((prev) => [...prev, tag.id])
  }

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await tasksApi.create({
        title: title.trim(),
        description: description || null,
        notes: notes || null,
        column_id: columnId,
        priority_id: priorityId,
        deadline,
        external_reference: externalReference || null,
        tag_ids: tagIds,
        checklist_items: checklist,
      })

      // Files can only be uploaded once the task (and its id) exists, so this
      // runs as a follow-up step rather than part of the create payload.
      let finalTask = created
      for (const file of pendingFiles) {
        try {
          const attachment = await attachmentsApi.upload(created.id, file)
          finalTask = { ...finalTask, attachments: [...finalTask.attachments, attachment] }
        } catch {
          // The task itself was created successfully — a single failed
          // attachment (e.g. too large) shouldn't block or roll that back.
        }
      }

      onCreated(finalTask)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : GENERIC_CREATE_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <h3 className="flex items-center gap-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
      <Sparkles className="h-5 w-5 text-indigo-500" strokeWidth={2} /> New task
    </h3>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="gradient" onClick={handleSubmit} disabled={!title.trim() || submitting}>
        <Rocket className="h-4 w-4" strokeWidth={2} /> {submitting ? 'Creating…' : 'Create task'}
      </Button>
    </div>
  )

  return (
    <FloatingWindow onClose={onClose} header={header} footer={footer} ariaLabel="New task">
      <div className="space-y-3">
        {submitError && (
          <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {submitError}
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="What needs to be done?"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <TaskFormSection>
          <PriorityDeadlineFields
            priorityId={priorityId}
            onPriorityChange={setPriorityId}
            priorities={priorities}
            deadline={deadline}
            onDeadlineChange={setDeadline}
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
          />
        </TaskFormSection>

        <TaskFormSection>
          <TaskTagsField
            allTags={tags}
            selectedIds={tagIds}
            onToggle={(id) => setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))}
            onCreateTag={handleCreateTag}
          />
        </TaskFormSection>

        <TaskFormSection>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <CheckSquare className="h-3.5 w-3.5" strokeWidth={2} /> Checklist
          </label>
          <DraftChecklistEditor items={checklist} onChange={setChecklist} />
        </TaskFormSection>

        <TaskFormSection>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Paperclip className="h-3.5 w-3.5" strokeWidth={2} /> Attachments
          </label>
          <DraftAttachmentsEditor files={pendingFiles} onChange={setPendingFiles} />
        </TaskFormSection>

        <TaskFormSection>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link2 className="h-3.5 w-3.5" strokeWidth={2} /> External reference
          </label>
          <input
            value={externalReference}
            onChange={(e) => setExternalReference(e.target.value)}
            placeholder="e.g. PROJ-123"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
          />
        </TaskFormSection>
      </div>
    </FloatingWindow>
  )
}
