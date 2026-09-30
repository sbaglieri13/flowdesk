import { Calendar, CircleDot, Flag, Shapes } from 'lucide-react'
import type { Priority, TaskType } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'
import { DateField } from './DateField'
import { PrioritySelect } from './PrioritySelect'
import { TaskTypeSelect } from './TaskTypeSelect'

interface StatusFieldProps {
  value: number
  onChange: (columnId: number) => void
  options: ListboxOption<number>[]
}

interface TaskMetaFieldsProps {
  priorityId: number | undefined
  onPriorityChange: (priorityId: number) => void
  priorities: Priority[]
  typeId: number | null
  onTypeChange: (typeId: number | null) => void
  taskTypes: TaskType[]
  deadline: string | null
  onDeadlineChange: (value: string | null) => void
  status?: StatusFieldProps
}

export function TaskMetaFields({
  priorityId,
  onPriorityChange,
  priorities,
  typeId,
  onTypeChange,
  taskTypes,
  deadline,
  onDeadlineChange,
  status,
}: TaskMetaFieldsProps) {
  return (
    <div className={`grid gap-2 ${status ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
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
          <Shapes className="h-3.5 w-3.5" strokeWidth={2} /> Type
        </label>
        <TaskTypeSelect value={typeId} onChange={onTypeChange} taskTypes={taskTypes} />
      </div>
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
