import { api } from './client'
import type { Priority } from '../types'

export const prioritiesApi = {
  list: () => api.get<Priority[]>('/priorities'),
  create: (name: string, emoji: string, color: string) => api.post<Priority>('/priorities', { name, emoji, color }),
  update: (id: number, payload: { name?: string; emoji?: string; color?: string; is_hidden?: boolean }) =>
    api.patch<Priority>(`/priorities/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/priorities/${id}`),
}
