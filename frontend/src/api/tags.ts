import { api } from './client'
import type { Tag } from '../types'

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  create: (name: string, color: string, icon: string) => api.post<Tag>('/tags', { name, color, icon }),
  update: (id: number, payload: { name?: string; color?: string; icon?: string }) =>
    api.patch<Tag>(`/tags/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/tags/${id}`),
}
