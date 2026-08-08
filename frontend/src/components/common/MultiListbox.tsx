import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { ListboxOption } from './Listbox'

interface MultiListboxProps<T extends string | number> {
  values: T[]
  onChange: (values: T[]) => void
  options: ListboxOption<T>[]
  placeholder: string
  className?: string
  id?: string
}

function OptionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
      }`}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  )
}

export function MultiListbox<T extends string | number>({
  values,
  onChange,
  options,
  placeholder,
  className = '',
  id,
}: MultiListboxProps<T>) {
  const [open, setOpen] = useState(false)
  const allSelected = options.length > 0 && options.every((o) => values.includes(o.value))

  useEscapeKey(() => {
    if (open) setOpen(false)
  })

  const toggle = (value: T) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value))
  }

  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label)
  const buttonText =
    selectedLabels.length === 0
      ? 'None selected'
      : selectedLabels.length === options.length
        ? placeholder
        : selectedLabels.length === 1
          ? selectedLabels[0]
          : `${selectedLabels.length} selected`

  return (
    <div className="relative inline-block">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-2.5 text-sm text-slate-700 transition hover:border-indigo-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:focus:ring-indigo-500/20 ${className}`}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="nice-scrollbar absolute left-0 z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {options.length > 0 && (
              <li className="mb-1 border-b border-slate-100 pb-1 dark:border-slate-700">
                <button
                  type="button"
                  onClick={toggleAll}
                  aria-pressed={allSelected}
                  className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                >
                  <OptionCheckbox checked={allSelected} />
                  Select all
                </button>
              </li>
            )}
            {options.map((option) => {
              const isSelected = values.includes(option.value)
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <OptionCheckbox checked={isSelected} />
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
