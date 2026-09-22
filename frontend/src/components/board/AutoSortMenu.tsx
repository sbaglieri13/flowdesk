import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tasksApi } from '../../api/tasks'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface AutoSortMenuProps {
  columnId: number
  onSorted: () => void
}

type SortKey = 'priority' | 'deadline'
type SortOrder = 'asc' | 'desc'

const SORT_GROUPS: { key: SortKey; label: string; options: { order: SortOrder; label: string }[] }[] = [
  {
    key: 'priority',
    label: 'Priority',
    options: [
      { order: 'desc', label: 'Highest first' },
      { order: 'asc', label: 'Lowest first' },
    ],
  },
  {
    key: 'deadline',
    label: 'Deadline',
    options: [
      { order: 'asc', label: 'Soonest first' },
      { order: 'desc', label: 'Latest first' },
    ],
  },
]

export function AutoSortMenu({ columnId, onSorted }: AutoSortMenuProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEscapeKey(() => {
    if (open) setOpen(false)
  })

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(timer)
  }, [error])

  const sortBy = async (by: SortKey, order: SortOrder) => {
    setOpen(false)
    setError(null)
    try {
      await tasksApi.autoSort(columnId, by, order)
      onSorted()
    } catch {
      setError('Could not auto-sort this column.')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label="Auto-sort column"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ArrowUpDown className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-soft-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {SORT_GROUPS.map((group, index) => (
              <div key={group.key} className={index > 0 ? 'mt-1 border-t border-slate-100 pt-1 dark:border-slate-700' : ''}>
                <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
                {group.options.map((option) => (
                  <button
                    key={option.order}
                    type="button"
                    role="menuitem"
                    onClick={() => sortBy(group.key, option.order)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {option.order === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="absolute right-0 z-20 mt-1 w-40 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-600 shadow-lg dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
