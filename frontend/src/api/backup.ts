import { api } from './client'
import type { BackupInfo } from '../types'

export const backupApi = {
  export: () => api.post<BackupInfo>('/backup/export'),
  list: () => api.get<BackupInfo[]>('/backup/list'),
  restore: (filename: string) => api.post<void>('/backup/restore', { filename }),
  downloadUrl: (filename: string) => `/api/backup/download/${encodeURIComponent(filename)}`,
}
