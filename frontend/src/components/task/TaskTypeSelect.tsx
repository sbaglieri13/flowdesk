import type { TaskType } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'

interface TaskTypeSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  taskTypes: TaskType[]
}

const UNASSIGNED = -1

export function TaskTypeSelect({ value, onChange, taskTypes }: TaskTypeSelectProps) {
  const visible = taskTypes.filter((t) => !t.is_hidden || t.id === value)
  const options: ListboxOption<number>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...visible.map((t) => ({ value: t.id, label: `${t.emoji} ${t.name}` })),
  ]

  return (
    <Listbox
      value={value ?? UNASSIGNED}
      onChange={(next) => onChange(next === UNASSIGNED ? null : next)}
      options={options}
    />
  )
}
