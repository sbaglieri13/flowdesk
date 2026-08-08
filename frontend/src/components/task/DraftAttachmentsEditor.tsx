import { Paperclip, Upload, X } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { formatFileSize } from '../../utils/fileSize'
import { Button } from '../ui/button'

interface DraftAttachmentsEditorProps {
  files: File[]
  onChange: (files: File[]) => void
}

/** Stages files to upload once the task exists — a new task has no id yet, so
 * nothing can actually be attached until the create request resolves. */
export function DraftAttachmentsEditor({ files, onChange }: DraftAttachmentsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    onChange([...files, file])
  }

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{file.name}</span>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatFileSize(file.size)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                onClick={() => handleRemove(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" strokeWidth={2} /> Attach a file
        </Button>
      </div>
    </div>
  )
}
