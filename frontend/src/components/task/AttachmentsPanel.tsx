import { useState } from 'react'
import { attachmentsApi } from '../../api/attachments'
import type { Attachment } from '../../types'
import { AttachmentPreview } from './AttachmentPreview'
import { AttachmentRow } from './AttachmentRow'
import { DraftAttachmentsEditor } from './DraftAttachmentsEditor'

interface AttachmentsPanelProps {
  taskId: number
  items: Attachment[]
  onRemoveExisting: (attachmentId: number) => void
  pendingFiles: File[]
  onPendingFilesChange: (files: File[]) => void
  onPreviewOpenChange?: (open: boolean) => void
}

export function AttachmentsPanel({
  taskId,
  items,
  onRemoveExisting,
  pendingFiles,
  onPendingFilesChange,
  onPreviewOpenChange,
}: AttachmentsPanelProps) {
  const safeItems = items ?? []
  const [previewing, setPreviewing] = useState<Attachment | null>(null)

  const openPreview = (attachment: Attachment) => {
    setPreviewing(attachment)
    onPreviewOpenChange?.(true)
  }

  const closePreview = () => {
    setPreviewing(null)
    onPreviewOpenChange?.(false)
  }

  return (
    <div className="space-y-2">
      {safeItems.length > 0 && (
        <ul className="space-y-1.5">
          {safeItems.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              filename={attachment.filename}
              sizeBytes={attachment.size_bytes}
              downloadUrl={attachmentsApi.downloadUrl(taskId, attachment.id)}
              onPreview={attachment.preview_kind ? () => openPreview(attachment) : undefined}
              onRemove={() => onRemoveExisting(attachment.id)}
            />
          ))}
        </ul>
      )}

      <DraftAttachmentsEditor files={pendingFiles} onChange={onPendingFilesChange} />

      {previewing?.preview_kind && (
        <AttachmentPreview
          filename={previewing.filename}
          kind={previewing.preview_kind}
          previewUrl={attachmentsApi.previewUrl(taskId, previewing.id)}
          downloadUrl={attachmentsApi.downloadUrl(taskId, previewing.id)}
          onClose={closePreview}
        />
      )}
    </div>
  )
}
