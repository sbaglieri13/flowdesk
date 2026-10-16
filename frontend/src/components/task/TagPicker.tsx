import { Check } from '../../icons/phosphor'
import { useState, type CSSProperties } from 'react'
import { ApiError } from '../../api/client'
import type { Tag } from '../../types'
import { suggestedColor } from '../../icons/catalog'
import { EntityIcon } from '../common/EntityIcon'
import { ColorSwatches } from '../common/ColorSwatches'
import { IconPicker } from '../common/IconPicker'
import { TAG_SWATCHES } from '../../utils/tagColors'

const DEFAULT_TAG_ICON = 'tag'

interface TagPickerProps {
  allTags: Tag[]
  selectedIds: number[]
  onToggle: (tagId: number) => void
  onCreateTag: (name: string, color: string, icon: string) => Promise<void>
}

export function TagPicker({ allTags, selectedIds, onToggle, onCreateTag }: TagPickerProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_SWATCHES[0])
  const [icon, setIcon] = useState(DEFAULT_TAG_ICON)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await onCreateTag(name.trim(), color, icon)
      setName('')
      setIcon(DEFAULT_TAG_ICON)
      setCreating(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create tag. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const selected = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              aria-pressed={selected}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                selected ? 'shadow-sm ring-2 ring-offset-1 dark:ring-offset-slate-800' : 'bg-transparent opacity-70 hover:opacity-100'
              }`}
              style={
                {
                  backgroundColor: selected ? tag.color : 'transparent',
                  color: selected ? '#fff' : tag.color,
                  border: `1.5px solid ${tag.color}`,
                  ...(selected ? { '--tw-ring-color': tag.color } : {}),
                } as CSSProperties
              }
            >
              {selected && <Check className="h-3 w-3" aria-hidden="true" />}
              {!selected && <EntityIcon name={tag.icon} className="h-3.5 w-3.5" />}
              {tag.name}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400"
        >
          + New tag
        </button>
      </div>

      {creating && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <IconPicker
              value={icon}
              onChange={(next) => {
                setIcon(next)
                setColor(suggestedColor(next) ?? color)
              }}
              color={color}
              label="Icon for new tag"
              disabled={submitting}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Tag name"
              disabled={submitting}
              className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>

          <div className="space-y-2">
            <ColorSwatches value={color} onChange={setColor} disabled={submitting} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
