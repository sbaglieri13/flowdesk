import { api } from './client'
import type { Settings } from '../types'

export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  update: (payload: Partial<Settings>) => api.put<Settings>('/settings', payload),
}
