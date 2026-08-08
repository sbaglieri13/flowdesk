import { api } from './client'
import type { Attachment } from '../types'

export const attachmentsApi = {
  list: (taskId: number) => api.get<Attachment[]>(`/tasks/${taskId}/attachments`),
  upload: (taskId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<Attachment>(`/tasks/${taskId}/attachments`, formData)
  },
  remove: (taskId: number, attachmentId: number) => api.delete<void>(`/tasks/${taskId}/attachments/${attachmentId}`),
  downloadUrl: (taskId: number, attachmentId: number) => `/api/tasks/${taskId}/attachments/${attachmentId}/download`,
}
