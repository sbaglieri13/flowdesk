import { ArrowUpDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tasksApi } from '../../api/tasks'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface AutoSortMenuProps {
  columnId: number
  onSorted: () => void
}

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

  const sortBy = async (by: 'priority' | 'deadline') => {
    setOpen(false)
    setError(null)
    try {
      await tasksApi.autoSort(columnId, by)
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
            className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-soft-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => sortBy('priority')}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Sort by priority
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => sortBy('deadline')}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Sort by deadline
            </button>
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
