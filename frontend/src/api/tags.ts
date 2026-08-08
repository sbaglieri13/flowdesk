import { api } from './client'
import type { Tag } from '../types'

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  create: (name: string, color: string, emoji?: string) => api.post<Tag>('/tags', { name, color, emoji }),
  update: (id: number, payload: { name?: string; color?: string; emoji?: string | null }) =>
    api.patch<Tag>(`/tags/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/tags/${id}`),
}
