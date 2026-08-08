import { Calendar, Flag } from 'lucide-react'
import type { Priority } from '../../types'
import { DateField } from './DateField'
import { PrioritySelect } from './PrioritySelect'

interface PriorityDeadlineFieldsProps {
  priorityId: number | undefined
  onPriorityChange: (priorityId: number) => void
  priorities: Priority[]
  deadline: string | null
  onDeadlineChange: (value: string | null) => void
}

export function PriorityDeadlineFields({
  priorityId,
  onPriorityChange,
  priorities,
  deadline,
  onDeadlineChange,
}: PriorityDeadlineFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Flag className="h-3.5 w-3.5" strokeWidth={2} /> Priority
        </label>
        {priorityId !== undefined && (
          <PrioritySelect value={priorityId} onChange={onPriorityChange} priorities={priorities} />
        )}
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} /> Deadline
        </label>
        <DateField value={deadline} onChange={onDeadlineChange} />
      </div>
    </div>
  )
}
