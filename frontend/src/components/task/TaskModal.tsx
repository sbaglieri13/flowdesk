import { AlertTriangle, CheckSquare, Clock, ExternalLink, Link2, Paperclip, Save, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { attachmentsApi } from '../../api/attachments'
import { reportersApi } from '../../api/reporters'
import { tagsApi } from '../../api/tags'
import { tasksApi, type TaskUpdatePayload } from '../../api/tasks'
import { useBoardData } from '../../state/BoardContext'
import type { ChecklistItem, Task, TimeEntry } from '../../types'
import { checklistChanged, saveChecklistChanges } from '../../utils/checklistDiff'
import { saveTimeEntryChanges, timeEntriesChanged } from '../../utils/timeEntryDiff'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FloatingWindow } from '../common/FloatingWindow'
import type { ListboxOption } from '../common/Listbox'
import { Button } from '../ui/button'
import { AttachmentsPanel } from './AttachmentsPanel'
import { ChecklistPanel } from './ChecklistPanel'
import { DescriptionNotesFields } from './DescriptionNotesFields'
import { ReporterPicker } from './ReporterPicker'
import { TaskFormSection } from './TaskFormSection'
import { TaskMetaFields } from './TaskMetaFields'
import { TaskTagsField } from './TaskTagsField'
import { TimeTrackingPanel } from './TimeTrackingPanel'

interface TaskModalProps {
  task: Task
  onClose: () => void
  onUpdated: (task: Task) => void
  onDeleted: (taskId: number) => void
}

const GENERIC_SAVE_ERROR = 'Could not save your changes. Please try again.'

function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedB = [...b].sort((x, y) => x - y)
  return [...a].sort((x, y) => x - y).every((id, i) => id === sortedB[i])
}

export function TaskModal({ task, onClose, onUpdated, onDeleted }: TaskModalProps) {
  const { columns, tags, priorities, taskTypes, reporters, settings, refreshTags, refreshReporters } = useBoardData()
  const [current, setCurrent] = useState(task)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [externalReference, setExternalReference] = useState(task.external_reference ?? '')
  const [reporterId, setReporterId] = useState<number | null>(task.reporter?.id ?? null)
  const [docUrl, setDocUrl] = useState(task.doc_url ?? '')
  const [statusId, setStatusId] = useState(task.column_id)
  const [priorityId, setPriorityId] = useState(task.priority.id)
  const [typeId, setTypeId] = useState<number | null>(task.type?.id ?? null)
  const [deadline, setDeadline] = useState<string | null>(task.deadline)
  const [tagIds, setTagIds] = useState<number[]>(task.tags.map((t) => t.id))
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist_items)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(task.time_entries)
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [activeSection, setActiveSection] = useState<'description' | 'notes'>('description')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const dirty =
    title.trim() !== current.title ||
    description !== (current.description ?? '') ||
    notes !== (current.notes ?? '') ||
    externalReference !== (current.external_reference ?? '') ||
    reporterId !== (current.reporter?.id ?? null) ||
    docUrl !== (current.doc_url ?? '') ||
    statusId !== current.column_id ||
    priorityId !== current.priority.id ||
    typeId !== (current.type?.id ?? null) ||
    deadline !== current.deadline ||
    !sameIds(tagIds, current.tags.map((t) => t.id)) ||
    checklistChanged(current.checklist_items, checklist) ||
    timeEntriesChanged(current.time_entries, timeEntries) ||
    removedAttachmentIds.length > 0 ||
    pendingFiles.length > 0

  const seedDrafts = (from: Task) => {
    setCurrent(from)
    setTitle(from.title)
    setDescription(from.description ?? '')
    setNotes(from.notes ?? '')
    setExternalReference(from.external_reference ?? '')
    setReporterId(from.reporter?.id ?? null)
    setDocUrl(from.doc_url ?? '')
    setStatusId(from.column_id)
    setPriorityId(from.priority.id)
    setTypeId(from.type?.id ?? null)
    setDeadline(from.deadline)
    setTagIds(from.tags.map((t) => t.id))
    setChecklist(from.checklist_items)
    setTimeEntries(from.time_entries)
    setRemovedAttachmentIds([])
    setPendingFiles([])
  }

  const requestClose = () => {
    if (dirty) setConfirmingDiscard(true)
    else onClose()
  }

  const handleSave = async () => {
    if (!dirty || saving || !title.trim()) return
    setSaving(true)
    setSaveError(null)
    let appliedSomething = false
    try {
      const payload: TaskUpdatePayload = {}
      if (title.trim() !== current.title) payload.title = title.trim()
      if (description !== (current.description ?? '')) payload.description = description
      if (notes !== (current.notes ?? '')) payload.notes = notes
      if (externalReference !== (current.external_reference ?? '')) payload.external_reference = externalReference || null
      if (reporterId !== (current.reporter?.id ?? null)) payload.reporter_id = reporterId
      if (docUrl !== (current.doc_url ?? '')) payload.doc_url = docUrl || null
      if (priorityId !== current.priority.id) payload.priority_id = priorityId
      if (typeId !== (current.type?.id ?? null)) payload.type_id = typeId
      if (deadline !== current.deadline) payload.deadline = deadline
      if (!sameIds(tagIds, current.tags.map((t) => t.id))) payload.tag_ids = tagIds

      if (Object.keys(payload).length > 0) {
        appliedSomething = true
        await tasksApi.update(current.id, payload)
      }
      if (statusId !== current.column_id) {
        appliedSomething = true
        await tasksApi.move(current.id, statusId)
      }
      if (checklistChanged(current.checklist_items, checklist)) {
        appliedSomething = true
        await saveChecklistChanges(current.id, current.checklist_items, checklist)
      }
      if (timeEntriesChanged(current.time_entries, timeEntries)) {
        appliedSomething = true
        await saveTimeEntryChanges(current.id, current.time_entries, timeEntries)
      }
      for (const attachmentId of removedAttachmentIds) {
        appliedSomething = true
        await attachmentsApi.remove(current.id, attachmentId)
      }
      for (const file of pendingFiles) {
        appliedSomething = true
        await attachmentsApi.upload(current.id, file)
      }

      onUpdated(await tasksApi.get(current.id))
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : GENERIC_SAVE_ERROR
      if (appliedSomething) {
        try {
          const fresh = await tasksApi.get(current.id)
          seedDrafts(fresh)
          onUpdated(fresh)
          setSaveError(`${message} Changes made before the error were saved and the form was reloaded.`)
        } catch {
          setSaveError(message)
        }
      } else {
        setSaveError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTag = async (name: string, color: string, emoji: string) => {
    await tagsApi.create(name, color, emoji || undefined)
    await refreshTags()
  }

  const handleCreateReporter = async (name: string) => {
    const created = await reportersApi.create(name)
    await refreshReporters()
    return created
  }

  const handleToggleTag = (tagId: number) =>
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))

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
    settings.external_reference_base_url && externalReference
      ? `${settings.external_reference_base_url.replace(/\/$/, '')}/${externalReference}`
      : null

  const statusOptions: ListboxOption<number>[] = columns
    .filter((c) => !c.is_hidden || c.id === current.column_id)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ value: c.id, label: c.emoji ? `${c.emoji} ${c.name}` : c.name }))

  const header = (
    <>
      <span className="text-xs font-mono font-semibold text-indigo-500">{current.display_code}</span>
      <input
        id="task-modal-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
        <Button variant="destructive" onClick={() => setConfirmingDelete(true)} disabled={saving}>
          <Trash2 className="h-4 w-4" strokeWidth={2} /> Delete task
        </Button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
          <Button variant="outline" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={!dirty || !title.trim() || saving}>
            <Save className="h-4 w-4" strokeWidth={2} /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <FloatingWindow
        onClose={requestClose}
        header={header}
        footer={footer}
        ariaLabel="Task details"
        disableEscape={confirmingDelete || confirmingDiscard}
        defaultWidth={840}
      >
        <div className="space-y-3">
          {saveError && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {saveError}
            </p>
          )}

          <TaskFormSection>
            <TaskMetaFields
              status={{ value: statusId, onChange: setStatusId, options: statusOptions }}
              priorityId={priorityId}
              onPriorityChange={setPriorityId}
              priorities={priorities}
              typeId={typeId}
              onTypeChange={setTypeId}
              taskTypes={taskTypes}
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
              defaultMode="preview"
            />
          </TaskFormSection>

          <TaskFormSection>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <UserRound className="h-3.5 w-3.5" strokeWidth={2} /> Reporter
                </label>
                <ReporterPicker
                  reporters={reporters}
                  selectedId={reporterId}
                  onChange={setReporterId}
                  onCreateReporter={handleCreateReporter}
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={2} /> Documentation link
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="Confluence, Notion, wiki page…"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
                  />
                  {docUrl && (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                      aria-label="Open documentation link"
                      title={docUrl}
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </TaskFormSection>

          <TaskFormSection>
            <TaskTagsField
              allTags={tags}
              selectedIds={tagIds}
              onToggle={handleToggleTag}
              onCreateTag={handleCreateTag}
            />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <CheckSquare className="h-3.5 w-3.5" strokeWidth={2} /> Checklist
            </label>
            <ChecklistPanel items={checklist} onItemsChange={setChecklist} />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Paperclip className="h-3.5 w-3.5" strokeWidth={2} /> Attachments
            </label>
            <AttachmentsPanel
              taskId={current.id}
              items={(current.attachments ?? []).filter((a) => !removedAttachmentIds.includes(a.id))}
              onRemoveExisting={(id) => setRemovedAttachmentIds((prev) => [...prev, id])}
              pendingFiles={pendingFiles}
              onPendingFilesChange={setPendingFiles}
            />
          </TaskFormSection>

          <TaskFormSection>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} /> Time tracking
            </label>
            <TimeTrackingPanel entries={timeEntries} onEntriesChange={setTimeEntries} />
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

      {confirmingDiscard && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="You have changes that haven't been saved. If you close now, they will be lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          destructive
          onConfirm={onClose}
          onCancel={() => setConfirmingDiscard(false)}
        />
      )}
    </>
  )
}
