import type { Priority } from '../../types'
import { Listbox, type ListboxOption } from '../common/Listbox'

interface PrioritySelectProps {
  value: number
  onChange: (value: number) => void
  priorities: Priority[]
}

export function PrioritySelect({ value, onChange, priorities }: PrioritySelectProps) {
  const visible = priorities.filter((p) => !p.is_hidden || p.id === value)
  const options: ListboxOption<number>[] = visible.map((p) => ({
    value: p.id,
    label: `${p.emoji} ${p.name}`,
  }))

  return <Listbox value={value} onChange={onChange} options={options} />
}
