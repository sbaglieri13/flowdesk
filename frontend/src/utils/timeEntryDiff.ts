import { timeEntriesApi } from '../api/timeEntries'
import type { TimeEntry } from '../types'

export function isDraftTimeEntry(entry: TimeEntry): boolean {
  return entry.id < 0
}

export function timeEntriesChanged(original: TimeEntry[], draft: TimeEntry[]): boolean {
  if (original.length !== draft.length) return true
  const byId = new Map(original.map((e) => [e.id, e]))
  return draft.some((entry) => {
    const before = byId.get(entry.id)
    return !before || before.hours !== entry.hours || before.note !== entry.note || before.logged_date !== entry.logged_date
  })
}

export async function saveTimeEntryChanges(
  taskId: number,
  original: TimeEntry[],
  draft: TimeEntry[],
): Promise<void> {
  const draftIds = new Set(draft.map((e) => e.id))
  const originalById = new Map(original.map((e) => [e.id, e]))

  for (const entry of original) {
    if (!draftIds.has(entry.id)) await timeEntriesApi.remove(taskId, entry.id)
  }

  for (const entry of draft) {
    if (isDraftTimeEntry(entry)) {
      await timeEntriesApi.create(taskId, { hours: entry.hours, note: entry.note, logged_date: entry.logged_date })
      continue
    }
    const before = originalById.get(entry.id)
    if (!before) continue
    const patch: { hours?: number; note?: string | null; logged_date?: string } = {}
    if (before.hours !== entry.hours) patch.hours = entry.hours
    if (before.note !== entry.note) patch.note = entry.note
    if (before.logged_date !== entry.logged_date) patch.logged_date = entry.logged_date
    if (Object.keys(patch).length) await timeEntriesApi.update(taskId, entry.id, patch)
  }
}
