import { Clock, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { TimeEntry } from '../../types'
import { Button } from '../ui/button'

interface TimeTrackingPanelProps {
  entries: TimeEntry[]
  onEntriesChange: (entries: TimeEntry[]) => void
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateInputClass =
  'w-[8.5rem] shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
const hoursInputClass =
  'w-16 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
const noteInputClass =
  'min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'

export function TimeTrackingPanel({ entries, onEntriesChange }: TimeTrackingPanelProps) {
  const [newHours, setNewHours] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newDate, setNewDate] = useState(todayIso())
  const nextTempIdRef = useRef(-1)

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
  const sorted = [...entries].sort((a, b) => (a.logged_date < b.logged_date ? 1 : -1))

  const handleAdd = () => {
    const hours = parseFloat(newHours)
    if (!hours || hours <= 0) return
    onEntriesChange([
      ...entries,
      {
        id: nextTempIdRef.current--,
        hours,
        note: newNote.trim() || null,
        logged_date: newDate,
        created_at: new Date().toISOString(),
      },
    ])
    setNewHours('')
    setNewNote('')
  }

  const handleRemove = (id: number) => onEntriesChange(entries.filter((e) => e.id !== id))

  const handleHoursChange = (id: number, value: string) => {
    const hours = parseFloat(value)
    if (!Number.isFinite(hours) || hours <= 0) return
    onEntriesChange(entries.map((e) => (e.id === id ? { ...e, hours } : e)))
  }

  const handleNoteChange = (id: number, value: string) =>
    onEntriesChange(entries.map((e) => (e.id === id ? { ...e, note: value || null } : e)))

  const handleDateChange = (id: number, value: string) =>
    onEntriesChange(entries.map((e) => (e.id === id ? { ...e, logged_date: value } : e)))

  return (
    <div className="space-y-2">
      {entries.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} />
          {(totalHours % 1 === 0 ? totalHours : totalHours.toFixed(2))}h logged total
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-1.5 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <input
                type="date"
                value={entry.logged_date}
                onChange={(e) => handleDateChange(entry.id, e.target.value)}
                aria-label="Date"
                className={dateInputClass}
              />
              <input
                type="number"
                min="0.25"
                step="0.25"
                defaultValue={entry.hours}
                onBlur={(e) => handleHoursChange(entry.id, e.target.value)}
                aria-label="Hours"
                className={hoursInputClass}
              />
              <input
                type="text"
                defaultValue={entry.note ?? ''}
                onBlur={(e) => handleNoteChange(entry.id, e.target.value)}
                placeholder="Note (optional)"
                aria-label="Note"
                className={noteInputClass}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                onClick={() => handleRemove(entry.id)}
                aria-label="Delete time entry"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          aria-label="Date for new entry"
          className={dateInputClass}
        />
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={newHours}
          onChange={(e) => setNewHours(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Hours"
          aria-label="Hours for new entry"
          className={hoursInputClass}
        />
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Note (optional)"
          aria-label="Note for new entry"
          className={noteInputClass}
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleAdd}
          disabled={!newHours || parseFloat(newHours) <= 0}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Log
        </Button>
      </div>
    </div>
  )
}
