import { createContext, useContext } from 'react'
import type { BoardColumn, Priority, Reporter, Settings, Tag, TaskType } from '../types'

export interface BoardContextValue {
  columns: BoardColumn[]
  tags: Tag[]
  priorities: Priority[]
  taskTypes: TaskType[]
  reporters: Reporter[]
  settings: Settings
  loading: boolean
  refreshColumns: () => Promise<void>
  refreshTags: () => Promise<void>
  refreshPriorities: () => Promise<void>
  refreshTaskTypes: () => Promise<void>
  refreshReporters: () => Promise<void>
  refreshSettings: () => Promise<void>
}

export const BoardContext = createContext<BoardContextValue | null>(null)

export function useBoardData(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoardData must be used within a BoardProvider')
  return ctx
}
