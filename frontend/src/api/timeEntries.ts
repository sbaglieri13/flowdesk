import { api } from './client'
import type { TimeEntry } from '../types'

export interface TimeEntryPayload {
  hours: number
  note?: string | null
  logged_date?: string
}

export const timeEntriesApi = {
  list: (taskId: number) => api.get<TimeEntry[]>(`/tasks/${taskId}/time-entries`),
  create: (taskId: number, payload: TimeEntryPayload) =>
    api.post<TimeEntry>(`/tasks/${taskId}/time-entries`, payload),
  update: (taskId: number, entryId: number, payload: Partial<TimeEntryPayload>) =>
    api.patch<TimeEntry>(`/tasks/${taskId}/time-entries/${entryId}`, payload),
  remove: (taskId: number, entryId: number) => api.delete<void>(`/tasks/${taskId}/time-entries/${entryId}`),
}
