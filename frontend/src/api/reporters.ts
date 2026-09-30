import { api } from './client'
import type { Reporter } from '../types'

export const reportersApi = {
  list: () => api.get<Reporter[]>('/reporters'),
  create: (name: string) => api.post<Reporter>('/reporters', { name }),
  update: (id: number, name: string) => api.patch<Reporter>(`/reporters/${id}`, { name }),
  remove: (id: number) => api.delete<void>(`/reporters/${id}`),
}
