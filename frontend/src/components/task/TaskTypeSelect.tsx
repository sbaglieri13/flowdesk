import type { TaskType } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'
import { IconLabel } from '../common/IconLabel'

interface TaskTypeSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  taskTypes: TaskType[]
  labelId?: string
}

const UNASSIGNED = -1

export function TaskTypeSelect({ value, onChange, taskTypes, labelId }: TaskTypeSelectProps) {
  const visible = taskTypes.filter((t) => !t.is_hidden || t.id === value)
  const options: ListboxOption<number>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...visible.map((t) => ({ value: t.id, label: <IconLabel icon={t.icon} color={t.color} label={t.name} /> })),
  ]

  return (
    <Listbox
      value={value ?? UNASSIGNED}
      onChange={(next) => onChange(next === UNASSIGNED ? null : next)}
      options={options}
      labelId={labelId}
    />
  )
}
