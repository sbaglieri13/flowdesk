import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface DateFieldProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}

function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(value: string): string {
  return parseISODate(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const dayPickerClassNames = {
  root: 'p-3 text-sm',
  months: 'flex gap-4',
  month: 'space-y-2',
  month_caption: 'flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 px-8 h-8',
  nav: 'flex items-center justify-between absolute inset-x-1 top-1',
  button_previous:
    'h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-300',
  button_next:
    'h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-300',
  month_grid: 'w-full border-collapse',
  weekdays: 'flex',
  weekday: 'text-slate-400 dark:text-slate-500 w-8 h-8 text-xs font-medium flex items-center justify-center',
  week: 'flex',
  day: 'w-8 h-8 p-0 text-center',
  day_button:
    'w-8 h-8 rounded-full text-sm text-slate-700 hover:bg-indigo-100 dark:text-slate-200 dark:hover:bg-indigo-500/20 transition-colors',
  today: '[&>button]:font-bold [&>button]:text-indigo-600 dark:[&>button]:text-indigo-300',
  selected: '[&>button]:bg-indigo-600 [&>button]:text-white [&>button]:hover:bg-indigo-600',
  outside: '[&>button]:text-slate-300 dark:[&>button]:text-slate-600',
  disabled: '[&>button]:opacity-30',
}

export function DateField({ value, onChange, placeholder = 'No deadline' }: DateFieldProps) {
  const [open, setOpen] = useState(false)

  useEscapeKey(() => {
    if (open) setOpen(false)
  })

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
        {value ? formatDisplay(value) : <span className="text-slate-400">{placeholder}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-30 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <DayPicker
              mode="single"
              selected={value ? parseISODate(value) : undefined}
              onSelect={(date) => {
                onChange(date ? toISODate(date) : null)
                setOpen(false)
              }}
              classNames={dayPickerClassNames}
            />
            {value && (
              <div className="border-t border-slate-100 p-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="w-full rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Clear date
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
