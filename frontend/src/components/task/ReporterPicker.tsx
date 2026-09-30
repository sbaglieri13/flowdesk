import { Plus } from 'lucide-react'
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
}

const UNASSIGNED = -1

export function ReporterPicker({ reporters, selectedId, onChange, onCreateReporter }: ReporterPickerProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options: ListboxOption<number>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...reporters.map((r) => ({ value: r.id, label: r.name })),
  ]

  const handleCreate = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await onCreateReporter(name.trim())
      onChange(created.id)
      setName('')
      setCreating(false)
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
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setCreating((v) => !v)}
          aria-label="Add a new reporter"
          aria-expanded={creating}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      {creating && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New reporter name"
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
