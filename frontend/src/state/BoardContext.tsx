import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { columnsApi } from '../api/columns'
import { prioritiesApi } from '../api/priorities'
import { reportersApi } from '../api/reporters'
import { settingsApi } from '../api/settings'
import { tagsApi } from '../api/tags'
import { taskTypesApi } from '../api/taskTypes'
import type { BoardColumn, Priority, Reporter, Settings, Tag, TaskType } from '../types'
import { BoardContext } from './useBoardData'

export function BoardProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [reporters, setReporters] = useState<Reporter[]>([])
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
  const refreshTaskTypes = useCallback(async () => {
    setTaskTypes(await taskTypesApi.list())
  }, [])
  const refreshReporters = useCallback(async () => {
    setReporters(await reportersApi.list())
  }, [])
  const refreshSettings = useCallback(async () => {
    setSettings(await settingsApi.get())
  }, [])

  useEffect(() => {
    Promise.all([
      refreshColumns(),
      refreshTags(),
      refreshPriorities(),
      refreshTaskTypes(),
      refreshReporters(),
      refreshSettings(),
    ]).finally(() => setLoading(false))
  }, [refreshColumns, refreshTags, refreshPriorities, refreshTaskTypes, refreshReporters, refreshSettings])

  return (
    <BoardContext.Provider
      value={{
        columns,
        tags,
        priorities,
        taskTypes,
        reporters,
        settings,
        loading,
        refreshColumns,
        refreshTags,
        refreshPriorities,
        refreshTaskTypes,
        refreshReporters,
        refreshSettings,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}
