import { api } from './client'
import type { Task } from '../types'

export interface TaskFilters {
  column_id?: number
  priority_id?: number[]
  tag_id?: number[]
  search?: string
}

export interface TaskCreatePayload {
  title: string
  description?: string | null
  notes?: string | null
  column_id: number
  priority_id?: number
  deadline?: string | null
  external_reference?: string | null
  tag_ids?: number[]
  checklist_items?: string[]
}

export interface TaskUpdatePayload {
  title?: string
  description?: string | null
  notes?: string | null
  priority_id?: number
  deadline?: string | null
  external_reference?: string | null
  tag_ids?: number[]
}

function buildQuery(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.column_id !== undefined) params.set('column_id', String(filters.column_id))
  for (const id of filters.priority_id ?? []) params.append('priority_id', String(id))
  for (const id of filters.tag_id ?? []) params.append('tag_id', String(id))
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const tasksApi = {
  list: (filters: TaskFilters = {}) => api.get<Task[]>(`/tasks${buildQuery(filters)}`),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (payload: TaskCreatePayload) => api.post<Task>('/tasks', payload),
  update: (id: number, payload: TaskUpdatePayload) => api.patch<Task>(`/tasks/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/tasks/${id}`),
  move: (id: number, column_id: number, position?: number) =>
    api.post<Task>(`/tasks/${id}/move`, { column_id, position }),
  reorder: (column_id: number, ordered_task_ids: number[]) =>
    api.post<void>('/tasks/reorder', { column_id, ordered_task_ids }),
  autoSort: (column_id: number, sort_by: 'priority' | 'deadline', order: 'asc' | 'desc') =>
    api.post<void>('/tasks/auto-sort', { column_id, sort_by, order }),
}
