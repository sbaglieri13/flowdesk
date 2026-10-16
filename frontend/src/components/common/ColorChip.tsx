import { EntityIcon } from './EntityIcon'
interface ColorChipProps {
  name: string
  color: string
  icon?: string | null
  placeholder?: string
}

export function ColorChip({ name, color, icon, placeholder = 'Preview' }: ColorChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {icon && <EntityIcon name={icon} className="h-3.5 w-3.5" />}
      {name.trim() || placeholder}
    </span>
  )
}
