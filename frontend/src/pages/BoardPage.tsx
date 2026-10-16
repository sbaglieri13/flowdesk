import { Flag, Shapes, SlidersHorizontal, Tag as TagIcon, User, Warning } from '../icons/phosphor'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tasksApi } from '../api/tasks'
import { BoardColumn } from '../components/board/BoardColumn'
import { TaskCardContent } from '../components/board/TaskCardContent'
import { SearchFilterBar, type TaskFiltersState } from '../components/common/SearchFilterBar'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useBoardData } from '../state/useBoardData'
import type { Task } from '../types'
import { parseDndId } from '../utils/dnd'
import {
  IMPOSSIBLE_PRIORITY_ID,
  IMPOSSIBLE_REPORTER_ID,
  IMPOSSIBLE_TAG_ID,
  IMPOSSIBLE_TYPE_ID,
  NO_REPORTER_FILTER_ID,
  NO_TAG_FILTER_ID,
  NO_TYPE_FILTER_ID,
} from '../utils/taskFilters'

const SEARCH_DEBOUNCE_MS = 300
const POSITION_GAP = 1000
const NO_TASKS: Task[] = []

type FilterKey = 'priorityIds' | 'tagIds' | 'typeIds' | 'reporterIds'
const FILTER_KEYS: FilterKey[] = ['priorityIds', 'tagIds', 'typeIds', 'reporterIds']

const TaskModal = lazy(() => import('../components/task/TaskModal').then((m) => ({ default: m.TaskModal })))
const TaskCreateModal = lazy(() =>
  import('../components/task/TaskCreateModal').then((m) => ({ default: m.TaskCreateModal })),
)
const ColumnManager = lazy(() => import('../components/board/ColumnManager').then((m) => ({ default: m.ColumnManager })))
const TagManager = lazy(() => import('../components/board/TagManager').then((m) => ({ default: m.TagManager })))
const PriorityManager = lazy(() =>
  import('../components/board/PriorityManager').then((m) => ({ default: m.PriorityManager })),
)
const TaskTypeManager = lazy(() =>
  import('../components/board/TaskTypeManager').then((m) => ({ default: m.TaskTypeManager })),
)
const ReporterManager = lazy(() =>
  import('../components/board/ReporterManager').then((m) => ({ default: m.ReporterManager })),
)

function sameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

export function BoardPage() {
  const { columns, tags, priorities, taskTypes, reporters } = useBoardData()
  const [tasks, setTasks] = useState<Task[]>([])
  const allFilterIds = useMemo(
    () => ({
      priorityIds: priorities.filter((p) => !p.is_hidden).map((p) => p.id),
      tagIds: [NO_TAG_FILTER_ID, ...tags.map((t) => t.id)],
      typeIds: [NO_TYPE_FILTER_ID, ...taskTypes.map((t) => t.id)],
      reporterIds: [NO_REPORTER_FILTER_ID, ...reporters.map((r) => r.id)],
    }),
    [priorities, tags, taskTypes, reporters],
  )
  const [filters, setFilters] = useState<TaskFiltersState>(() => ({ search: '', ...allFilterIds }))
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [managingColumns, setManagingColumns] = useState(false)
  const [managingTags, setManagingTags] = useState(false)
  const [managingPriorities, setManagingPriorities] = useState(false)
  const [managingTaskTypes, setManagingTaskTypes] = useState(false)
  const [managingReporters, setManagingReporters] = useState(false)
  const [creatingInColumnId, setCreatingInColumnId] = useState<number | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)

  const visibleColumns = columns.filter((c) => !c.is_hidden)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)

  const knownFilterIdsRef = useRef(allFilterIds)
  useEffect(() => {
    const known = knownFilterIdsRef.current
    if (known === allFilterIds) return
    knownFilterIdsRef.current = allFilterIds
    setFilters((prev) => {
      const next = { ...prev }
      for (const key of FILTER_KEYS) {
        const added = allFilterIds[key].filter((id) => !known[key].includes(id))
        next[key] = [...prev[key].filter((id) => allFilterIds[key].includes(id)), ...added]
      }
      return FILTER_KEYS.every((key) => sameIds(next[key], prev[key])) ? prev : next
    })
  }, [allFilterIds])

  const [reloadKey, setReloadKey] = useState(0)
  const reloadTasks = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let cancelled = false
    tasksApi
      .list({
        search: debouncedSearch || undefined,
        priority_id: filters.priorityIds.length ? filters.priorityIds : [IMPOSSIBLE_PRIORITY_ID],
        tag_id: filters.tagIds.length ? filters.tagIds : [IMPOSSIBLE_TAG_ID],
        type_id: filters.typeIds.length ? filters.typeIds : [IMPOSSIBLE_TYPE_ID],
        reporter_id: filters.reporterIds.length ? filters.reporterIds : [IMPOSSIBLE_REPORTER_ID],
      })
      .then((loaded) => {
        if (!cancelled) setTasks(loaded)
      })
      .catch(() => {
        if (!cancelled) setBoardError('Could not load tasks. Check the server and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, filters.priorityIds, filters.tagIds, filters.typeIds, filters.reporterIds, reloadKey])

  const tasksByColumn = useMemo(() => {
    const grouped = new Map<number, Task[]>()
    for (const task of tasks) {
      const list = grouped.get(task.column_id)
      if (list) list.push(task)
      else grouped.set(task.column_id, [task])
    }
    for (const list of grouped.values()) list.sort((a, b) => a.position - b.position)
    return grouped
  }, [tasks])

  useEffect(() => {
    if (!boardError) return
    const timer = setTimeout(() => setBoardError(null), 5000)
    return () => clearTimeout(timer)
  }, [boardError])

  const handleDragStart = (event: DragStartEvent) => {
    const dragged = parseDndId(event.active.id)
    const task = dragged?.type === 'task' ? tasks.find((t) => t.id === dragged.id) : undefined
    setActiveTask(task ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const dragged = parseDndId(active.id)
    const target = parseDndId(over.id)
    if (dragged?.type !== 'task' || !target) return

    const activeTask = tasks.find((t) => t.id === dragged.id)
    if (!activeTask) return

    const targetColumnId = target.type === 'column' ? target.id : tasks.find((t) => t.id === target.id)?.column_id
    if (targetColumnId === undefined) return

    if (activeTask.column_id !== targetColumnId) {
      setTasks((prev) => prev.map((t) => (t.id === activeTask.id ? { ...t, column_id: targetColumnId } : t)))
      try {
        const updated = await tasksApi.move(activeTask.id, targetColumnId)
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } catch {
        setBoardError('Could not move the task. Reloading the board.')
        reloadTasks()
      }
      return
    }

    const columnTasks = tasksByColumn.get(activeTask.column_id) ?? NO_TASKS
    const oldIndex = columnTasks.findIndex((t) => t.id === activeTask.id)
    const newIndex = target.type === 'column' ? columnTasks.length - 1 : columnTasks.findIndex((t) => t.id === target.id)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, i) => ({ ...t, position: i * POSITION_GAP }))
    setTasks((prev) => [...prev.filter((t) => t.column_id !== activeTask.column_id), ...reordered])
    try {
      await tasksApi.reorder(
        activeTask.column_id,
        reordered.map((t) => t.id),
      )
    } catch {
      setBoardError('Could not reorder the tasks. Reloading the board.')
      reloadTasks()
    }
  }

  const handleTaskCreated = (created: Task) => {
    setTasks((prev) => [...prev, created])
  }

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
  }

  const handleTaskDeleted = (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTask(null)
  }

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-indigo-100/70 via-slate-100 to-slate-200/70 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
      {boardError && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <Warning className="h-4 w-4 shrink-0" /> {boardError}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-stretch gap-3">
        <SearchFilterBar
          filters={filters}
          onChange={setFilters}
          tags={tags}
          priorities={priorities}
          taskTypes={taskTypes}
          reporters={reporters}
        />

        <div className="flex shrink-0 flex-col justify-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Board setup</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setManagingTags(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <TagIcon className="h-4 w-4" />
              Tags
            </button>
            <button
              type="button"
              onClick={() => setManagingPriorities(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Flag className="h-4 w-4" />
              Priority
            </button>
            <button
              type="button"
              onClick={() => setManagingTaskTypes(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Shapes className="h-4 w-4" />
              Type
            </button>
            <button
              type="button"
              onClick={() => setManagingReporters(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <User className="h-4 w-4" />
              Reporters
            </button>
            <button
              type="button"
              onClick={() => setManagingColumns(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Columns
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="nice-scrollbar flex flex-1 items-start gap-4 overflow-x-auto pb-3">
          {visibleColumns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? NO_TASKS}
              onTaskClick={setSelectedTask}
              onSorted={reloadTasks}
              onAddTask={setCreatingInColumnId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1.1)' }}>
          {activeTask && (
            <div
              className="animate-lift w-72 cursor-grabbing rounded-xl border border-indigo-300 bg-white p-3 shadow-soft-lg dark:border-indigo-500 dark:bg-slate-800"
            >
              <TaskCardContent task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Suspense fallback={null}>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdated={handleTaskUpdated}
            onDeleted={handleTaskDeleted}
          />
        )}

        {creatingInColumnId !== null && (
          <TaskCreateModal
            columnId={creatingInColumnId}
            onClose={() => setCreatingInColumnId(null)}
            onCreated={handleTaskCreated}
          />
        )}

        {managingColumns && <ColumnManager onClose={() => setManagingColumns(false)} />}
        {managingTags && <TagManager onClose={() => setManagingTags(false)} />}
        {managingPriorities && <PriorityManager onClose={() => setManagingPriorities(false)} />}
        {managingTaskTypes && <TaskTypeManager onClose={() => setManagingTaskTypes(false)} />}
        {managingReporters && <ReporterManager onClose={() => setManagingReporters(false)} onTasksChanged={reloadTasks} />}
      </Suspense>
    </div>
  )
}
