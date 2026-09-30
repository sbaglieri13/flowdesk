import type { StatsBreakdownItem } from '../../api/stats'

interface BreakdownListProps {
  items: StatsBreakdownItem[]
  emptyMessage?: string
}

export function BreakdownList({ items, emptyMessage }: BreakdownListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">{emptyMessage ?? 'No data yet.'}</p>
  }

  const max = Math.max(...items.map((i) => i.count))

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.id ?? 'none'}-${item.label}`} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color ?? '#94a3b8' }}
            aria-hidden="true"
          />
          <span className="w-28 shrink-0 truncate text-sm text-slate-700 dark:text-slate-200" title={item.label}>
            {item.emoji ? `${item.emoji} ` : ''}
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-indigo-400 dark:bg-indigo-500"
              style={{ width: `${max === 0 ? 0 : (item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  )
}
