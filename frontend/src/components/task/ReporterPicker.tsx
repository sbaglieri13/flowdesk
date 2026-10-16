import { Plus, User, UserMinus } from '../../icons/phosphor'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import type { Reporter } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'
import { Button } from '../ui/button'

interface ReporterPickerProps {
  reporters: Reporter[]
  selectedId: number | null
  onChange: (id: number | null) => void
  onCreateReporter: (name: string) => Promise<Reporter>
  labelId?: string
}

const UNASSIGNED = -1
const MAX_NAME_LENGTH = 100

export function ReporterPicker({ reporters, selectedId, onChange, onCreateReporter, labelId }: ReporterPickerProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options: ListboxOption<number>[] = [
    {
      value: UNASSIGNED,
      label: (
        <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <UserMinus className="h-3.5 w-3.5" /> Unassigned
        </span>
      ),
    },
    ...reporters.map((r) => ({
      value: r.id,
      label: (
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-indigo-500" /> {r.name}
        </span>
      ),
    })),
  ]

  const closeCreate = () => {
    setCreating(false)
    setName('')
    setError(null)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || submitting) return
    const existing = reporters.find((r) => r.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      onChange(existing.id)
      closeCreate()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await onCreateReporter(trimmed)
      onChange(created.id)
      closeCreate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add reporter. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Listbox
          value={selectedId ?? UNASSIGNED}
          onChange={(value) => onChange(value === UNASSIGNED ? null : value)}
          options={options}
          labelId={labelId}
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => (creating ? closeCreate() : setCreating(true))}
          aria-label="Add a new reporter"
          aria-expanded={creating}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {creating && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') {
                e.stopPropagation()
                closeCreate()
              }
            }}
            placeholder="New reporter name"
            aria-label="New reporter name"
            disabled={submitting}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <Button size="sm" onClick={handleCreate} disabled={submitting || !name.trim()}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
