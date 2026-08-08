import { Check, ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export interface ListboxOption<T extends string | number> {
  value: T
  label: ReactNode
}

interface ListboxProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: ListboxOption<T>[]
  className?: string
  id?: string
}

export function Listbox<T extends string | number>({ value, onChange, options, className = '', id }: ListboxProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  useEscapeKey(() => {
    if (open) setOpen(false)
  })

  return (
    <div className="relative w-full">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-2.5 text-sm text-slate-700 transition hover:border-indigo-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:focus:ring-indigo-500/20 ${className}`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="nice-scrollbar absolute left-0 z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex w-3.5 shrink-0 items-center justify-center text-indigo-600 dark:text-indigo-300">
                      {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    </span>
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
