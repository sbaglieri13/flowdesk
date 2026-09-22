import { Paperclip, X } from 'lucide-react'
import { attachmentsApi } from '../../api/attachments'
import type { Attachment } from '../../types'
import { formatFileSize } from '../../utils/fileSize'
import { Button } from '../ui/button'
import { DraftAttachmentsEditor } from './DraftAttachmentsEditor'

interface AttachmentsPanelProps {
  taskId: number
  /** Attachments already saved on the task and not marked for removal. */
  items: Attachment[]
  onRemoveExisting: (attachmentId: number) => void
  pendingFiles: File[]
  onPendingFilesChange: (files: File[]) => void
}

/** Stages attachment changes (removals and new files); they are applied when the task is saved. */
export function AttachmentsPanel({
  taskId,
  items,
  onRemoveExisting,
  pendingFiles,
  onPendingFilesChange,
}: AttachmentsPanelProps) {
  // Defensive: a task fetched from a server that hasn't picked up this field
  // yet (e.g. not restarted since this feature shipped) would otherwise send
  // `attachments: undefined` and crash the whole modal on `.map`.
  const safeItems = items ?? []

  return (
    <div className="space-y-2">
      {safeItems.length > 0 && (
        <ul className="space-y-1">
          {safeItems.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <a
                href={attachmentsApi.downloadUrl(taskId, attachment.id)}
                download={attachment.filename}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-indigo-600 hover:underline dark:text-indigo-300"
                title={`Download ${attachment.filename}`}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">{attachment.filename}</span>
              </a>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatFileSize(attachment.size_bytes)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                onClick={() => onRemoveExisting(attachment.id)}
                aria-label={`Remove attachment ${attachment.filename}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DraftAttachmentsEditor files={pendingFiles} onChange={onPendingFilesChange} />
    </div>
  )
}
