import { EntityIcon } from './EntityIcon'

interface IconLabelProps {
  icon: string | null | undefined
  color?: string
  label: string
}

export function IconLabel({ icon, color, label }: IconLabelProps) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <EntityIcon name={icon} className="h-4 w-4 shrink-0" style={color ? { color } : undefined} />
      <span className="truncate">{label}</span>
    </span>
  )
}
