import type { ComponentType } from 'react'
import { Card } from '../ui/card'

interface StatTileProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  hint?: string
}

export function StatTile({ icon: Icon, label, value, hint }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} />
        {label}
      </span>
      <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      {hint && <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </Card>
  )
}
