import { AlertTriangle, Paperclip, Upload, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { attachmentsApi } from '../../api/attachments'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import type { Attachment } from '../../types'
import { formatFileSize } from '../../utils/fileSize'
import { Button } from '../ui/button'

interface AttachmentsPanelProps {
  taskId: number
  items: Attachment[]
  onItemsChange: (items: Attachment[]) => void
}

const GENERIC_ERROR = 'Could not update attachments. Please try again.'

export function AttachmentsPanel({ taskId, items, onItemsChange }: AttachmentsPanelProps) {
  // Defensive: a task fetched from a server that hasn't picked up this field
  // yet (e.g. not restarted since this feature shipped) would otherwise send
  // `attachments: undefined` and crash the whole modal on `.map`.
  const safeItems = items ?? []
  const { error, run: runOrReportError } = useAsyncAction(GENERIC_ERROR)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be re-selected later
    if (!file) return
    setUploading(true)
    await runOrReportError(async () => {
      const attachment = await attachmentsApi.upload(taskId, file)
      onItemsChange([...safeItems, attachment])
    })
    setUploading(false)
  }

  const handleDelete = (attachmentId: number) =>
    runOrReportError(async () => {
      await attachmentsApi.remove(taskId, attachmentId)
      onItemsChange(safeItems.filter((a) => a.id !== attachmentId))
    })

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
                onClick={() => handleDelete(attachment.id)}
                aria-label={`Remove attachment ${attachment.filename}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
        </p>
      )}

      <div>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} disabled={uploading} className="hidden" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" strokeWidth={2} /> {uploading ? 'Uploading…' : 'Upload a file'}
        </Button>
      </div>
    </div>
  )
}
