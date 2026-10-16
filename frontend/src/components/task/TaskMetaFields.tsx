import { CalendarBlank, Flag, Kanban, Shapes } from '../../icons/phosphor'
import { useId } from 'react'
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

const labelClass = 'mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400'

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
  const idPrefix = useId()
  const labelId = (field: string) => `${idPrefix}-${field}`

  return (
    <div className={`grid gap-2 ${status ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {status && (
        <div className="min-w-0">
          <span id={labelId('status')} className={labelClass}>
            <Kanban className="h-3.5 w-3.5" /> Status
          </span>
          <Listbox
            value={status.value}
            onChange={status.onChange}
            options={status.options}
            labelId={labelId('status')}
          />
        </div>
      )}
      <div className="min-w-0">
        <span id={labelId('type')} className={labelClass}>
          <Shapes className="h-3.5 w-3.5" /> Type
        </span>
        <TaskTypeSelect value={typeId} onChange={onTypeChange} taskTypes={taskTypes} labelId={labelId('type')} />
      </div>
      <div className="min-w-0">
        <span id={labelId('priority')} className={labelClass}>
          <Flag className="h-3.5 w-3.5" /> Priority
        </span>
        {priorityId !== undefined && (
          <PrioritySelect
            value={priorityId}
            onChange={onPriorityChange}
            priorities={priorities}
            labelId={labelId('priority')}
          />
        )}
      </div>
      <div className="min-w-0">
        <span id={labelId('deadline')} className={labelClass}>
          <CalendarBlank className="h-3.5 w-3.5" /> Deadline
        </span>
        <DateField value={deadline} onChange={onDeadlineChange} labelId={labelId('deadline')} />
      </div>
    </div>
  )
}
