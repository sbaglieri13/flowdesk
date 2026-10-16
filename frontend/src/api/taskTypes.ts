import { api } from './client'
import type { TaskType } from '../types'

export const taskTypesApi = {
  list: () => api.get<TaskType[]>('/task-types'),
  create: (name: string, icon: string, color: string) => api.post<TaskType>('/task-types', { name, icon, color }),
  update: (id: number, payload: { name?: string; icon?: string; color?: string; is_hidden?: boolean }) =>
    api.patch<TaskType>(`/task-types/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/task-types/${id}`),
}
