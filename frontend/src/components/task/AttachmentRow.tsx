import { DownloadSimple, Eye, X } from '../../icons/phosphor'
import { fileExtension, fileTypeIcon } from '../../utils/fileType'
import { formatFileSize } from '../../utils/fileSize'
import { Button } from '../ui/button'

interface AttachmentRowProps {
  filename: string
  sizeBytes: number
  downloadUrl?: string
  onPreview?: () => void
  onRemove: () => void
}

const mainAreaClass =
  'group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300'
const downloadChipClass =
  'flex shrink-0 items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:border-indigo-600 hover:bg-indigo-600 hover:text-white dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500'

export function AttachmentRow({ filename, sizeBytes, downloadUrl, onPreview, onRemove }: AttachmentRowProps) {
  const Icon = fileTypeIcon(filename)
  const extension = fileExtension(filename)
  const details = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          downloadUrl
            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'
        }`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-200">
          {filename}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {extension && `${extension.toUpperCase()} · `}
          {formatFileSize(sizeBytes)}
        </span>
      </span>
    </>
  )
  const downloadIcon = <DownloadSimple className="h-3.5 w-3.5" aria-hidden="true" />

  let content
  if (downloadUrl && onPreview) {
    content = (
      <>
        <button type="button" onClick={onPreview} aria-label={`Preview ${filename}`} title={`Preview ${filename}`} className={mainAreaClass}>
          {details}
        </button>
        <button
          type="button"
          onClick={onPreview}
          tabIndex={-1}
          aria-hidden="true"
          className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        <a href={downloadUrl} download={filename} aria-label={`Download ${filename}`} title={`Download ${filename}`} className={downloadChipClass}>
          {downloadIcon} Download
        </a>
      </>
    )
  } else if (downloadUrl) {
    content = (
      <a href={downloadUrl} download={filename} aria-label={`Download ${filename}`} title={`Download ${filename}`} className={mainAreaClass}>
        {details}
        <span className={downloadChipClass}>{downloadIcon} Download</span>
      </a>
    )
  } else {
    content = (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {details}
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          Pending upload
        </span>
      </div>
    )
  }

  return (
    <li className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 transition hover:border-indigo-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-500/50">
      {content}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
        onClick={onRemove}
        aria-label={`Remove attachment ${filename}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}
