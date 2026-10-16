import { Tag as TagIcon } from '../../icons/phosphor'
import type { Tag } from '../../types'
import { TagPicker } from './TagPicker'

interface TaskTagsFieldProps {
  allTags: Tag[]
  selectedIds: number[]
  onToggle: (tagId: number) => void
  onCreateTag: (name: string, color: string, icon: string) => Promise<void>
}

export function TaskTagsField({ allTags, selectedIds, onToggle, onCreateTag }: TaskTagsFieldProps) {
  return (
    <>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <TagIcon className="h-3.5 w-3.5" /> Tags
      </label>
      <TagPicker allTags={allTags} selectedIds={selectedIds} onToggle={onToggle} onCreateTag={onCreateTag} />
    </>
  )
}
