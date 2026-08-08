import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { columnsApi } from '../api/columns'
import { prioritiesApi } from '../api/priorities'
import { settingsApi } from '../api/settings'
import { tagsApi } from '../api/tags'
import type { BoardColumn, Priority, Settings, Tag } from '../types'

interface BoardContextValue {
  columns: BoardColumn[]
  tags: Tag[]
  priorities: Priority[]
  settings: Settings
  loading: boolean
  refreshColumns: () => Promise<void>
  refreshTags: () => Promise<void>
  refreshPriorities: () => Promise<void>
  refreshSettings: () => Promise<void>
}

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [settings, setSettings] = useState<Settings>({ external_reference_base_url: '' })
  const [loading, setLoading] = useState(true)

  const refreshColumns = useCallback(async () => {
    setColumns(await columnsApi.list())
  }, [])
  const refreshTags = useCallback(async () => {
    setTags(await tagsApi.list())
  }, [])
  const refreshPriorities = useCallback(async () => {
    setPriorities(await prioritiesApi.list())
  }, [])
  const refreshSettings = useCallback(async () => {
    setSettings(await settingsApi.get())
  }, [])

  useEffect(() => {
    Promise.all([refreshColumns(), refreshTags(), refreshPriorities(), refreshSettings()]).finally(() =>
      setLoading(false),
    )
  }, [refreshColumns, refreshTags, refreshPriorities, refreshSettings])

  return (
    <BoardContext.Provider
      value={{
        columns,
        tags,
        priorities,
        settings,
        loading,
        refreshColumns,
        refreshTags,
        refreshPriorities,
        refreshSettings,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardData(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoardData must be used within a BoardProvider')
  return ctx
}
