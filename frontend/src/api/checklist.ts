import { api } from './client'
import type { ChecklistItem } from '../types'

export const checklistApi = {
  list: (taskId: number) => api.get<ChecklistItem[]>(`/tasks/${taskId}/checklist`),
  create: (taskId: number, text: string) => api.post<ChecklistItem>(`/tasks/${taskId}/checklist`, { text }),
  update: (taskId: number, itemId: number, payload: { text?: string; is_done?: boolean }) =>
    api.patch<ChecklistItem>(`/tasks/${taskId}/checklist/${itemId}`, payload),
  toggle: (taskId: number, itemId: number) =>
    api.post<ChecklistItem>(`/tasks/${taskId}/checklist/${itemId}/toggle`),
  remove: (taskId: number, itemId: number) => api.delete<void>(`/tasks/${taskId}/checklist/${itemId}`),
  reorder: (taskId: number, orderedItemIds: number[]) =>
    api.patch<ChecklistItem[]>(`/tasks/${taskId}/checklist/reorder`, { ordered_item_ids: orderedItemIds }),
}
