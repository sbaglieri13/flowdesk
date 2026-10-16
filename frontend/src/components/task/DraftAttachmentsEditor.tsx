import { UploadSimple } from '../../icons/phosphor'
import { useRef, type ChangeEvent } from 'react'
import { Button } from '../ui/button'
import { AttachmentRow } from './AttachmentRow'

interface DraftAttachmentsEditorProps {
  files: File[]
  onChange: (files: File[]) => void
}

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
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <AttachmentRow
              key={`${file.name}-${index}`}
              filename={file.name}
              sizeBytes={file.size}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </ul>
      )}

      <div>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <UploadSimple className="h-4 w-4" /> Attach a file
        </Button>
      </div>
    </div>
  )
}
