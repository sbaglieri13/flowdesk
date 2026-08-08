import { api } from './client'
import type { BoardColumn } from '../types'

export const columnsApi = {
  list: () => api.get<BoardColumn[]>('/columns'),
  create: (name: string, emoji?: string) => api.post<BoardColumn>('/columns', { name, emoji }),
  update: (id: number, payload: { name?: string; emoji?: string; is_hidden?: boolean }) =>
    api.patch<BoardColumn>(`/columns/${id}`, payload),
  remove: (id: number) => api.delete<void>(`/columns/${id}`),
  reorder: (items: { id: number; position: number }[]) =>
    api.patch<BoardColumn[]>('/columns/reorder', { items }),
}
