import { Calendar, CircleDot, Flag } from 'lucide-react'
import type { Priority } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'
import { DateField } from './DateField'
import { PrioritySelect } from './PrioritySelect'

interface StatusFieldProps {
  value: number
  onChange: (columnId: number) => void
  options: ListboxOption<number>[]
}

interface PriorityDeadlineFieldsProps {
  priorityId: number | undefined
  onPriorityChange: (priorityId: number) => void
  priorities: Priority[]
  deadline: string | null
  onDeadlineChange: (value: string | null) => void
  /** When provided, a Status dropdown is shown on the same row (existing tasks only). */
  status?: StatusFieldProps
}

export function PriorityDeadlineFields({
  priorityId,
  onPriorityChange,
  priorities,
  deadline,
  onDeadlineChange,
  status,
}: PriorityDeadlineFieldsProps) {
  return (
    <div className={`grid gap-2 ${status ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {status && (
        <div className="min-w-0">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <CircleDot className="h-3.5 w-3.5" strokeWidth={2} /> Status
          </label>
          <Listbox value={status.value} onChange={status.onChange} options={status.options} />
        </div>
      )}
      <div className="min-w-0">
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Flag className="h-3.5 w-3.5" strokeWidth={2} /> Priority
        </label>
        {priorityId !== undefined && (
          <PrioritySelect value={priorityId} onChange={onPriorityChange} priorities={priorities} />
        )}
      </div>
      <div className="min-w-0">
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} /> Deadline
        </label>
        <DateField value={deadline} onChange={onDeadlineChange} />
      </div>
    </div>
  )
}
