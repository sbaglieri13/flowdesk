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
import { motion } from 'framer-motion'
import { AlertTriangle, Flag, Settings2, Shapes, Tag as TagIcon, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { tasksApi } from '../api/tasks'
import { BoardColumn } from '../components/board/BoardColumn'
import { ColumnManager } from '../components/board/ColumnManager'
import { PriorityManager } from '../components/board/PriorityManager'
import { ReporterManager } from '../components/board/ReporterManager'
import { TagManager } from '../components/board/TagManager'
import { TaskCardContent } from '../components/board/TaskCardContent'
import { TaskTypeManager } from '../components/board/TaskTypeManager'
import { SearchFilterBar, type TaskFiltersState } from '../components/common/SearchFilterBar'
import { TaskCreateModal } from '../components/task/TaskCreateModal'
import { TaskModal } from '../components/task/TaskModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useBoardData } from '../state/BoardContext'
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

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

export function BoardPage() {
  const { columns, tags, priorities, taskTypes, reporters, loading } = useBoardData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    priorityIds: [],
    tagIds: [],
    typeIds: [],
    reporterIds: [],
  })
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

  const filtersSeededRef = useRef(false)
  useEffect(() => {
    if (loading || filtersSeededRef.current) return
    filtersSeededRef.current = true
    setFilters((prev) => ({
      ...prev,
      priorityIds: priorities.filter((p) => !p.is_hidden).map((p) => p.id),
      tagIds: [NO_TAG_FILTER_ID, ...tags.map((t) => t.id)],
      typeIds: [NO_TYPE_FILTER_ID, ...taskTypes.map((t) => t.id)],
      reporterIds: [NO_REPORTER_FILTER_ID, ...reporters.map((r) => r.id)],
    }))
  }, [loading, priorities, tags, taskTypes, reporters])

  const loadTasks = () => {
    tasksApi
      .list({
        search: debouncedSearch || undefined,
        priority_id: filters.priorityIds.length ? filters.priorityIds : [IMPOSSIBLE_PRIORITY_ID],
        tag_id: filters.tagIds.length ? filters.tagIds : [IMPOSSIBLE_TAG_ID],
        type_id: filters.typeIds.length ? filters.typeIds : [IMPOSSIBLE_TYPE_ID],
        reporter_id: filters.reporterIds.length ? filters.reporterIds : [IMPOSSIBLE_REPORTER_ID],
      })
      .then(setTasks)
      .catch(() => setBoardError('Could not load tasks. Check the server and try again.'))
  }

  useEffect(loadTasks, [debouncedSearch, filters.priorityIds, filters.tagIds, filters.typeIds, filters.reporterIds])

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
        loadTasks()
      }
      return
    }

    const columnTasks = tasks.filter((t) => t.column_id === activeTask.column_id)
    const oldIndex = columnTasks.findIndex((t) => t.id === activeTask.id)
    const newIndex = target.type === 'column' ? columnTasks.length - 1 : columnTasks.findIndex((t) => t.id === target.id)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const reordered = arrayMove(columnTasks, oldIndex, newIndex)
    setTasks((prev) => [...prev.filter((t) => t.column_id !== activeTask.column_id), ...reordered])
    try {
      await tasksApi.reorder(
        activeTask.column_id,
        reordered.map((t) => t.id),
      )
    } catch {
      setBoardError('Could not reorder the tasks. Reloading the board.')
      loadTasks()
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
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} /> {boardError}
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
              <Settings2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Board setup</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setManagingTags(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <TagIcon className="h-4 w-4" strokeWidth={2} />
              Tags
            </button>
            <button
              type="button"
              onClick={() => setManagingPriorities(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Flag className="h-4 w-4" strokeWidth={2} />
              Priority
            </button>
            <button
              type="button"
              onClick={() => setManagingTaskTypes(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Shapes className="h-4 w-4" strokeWidth={2} />
              Type
            </button>
            <button
              type="button"
              onClick={() => setManagingReporters(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <UserRound className="h-4 w-4" strokeWidth={2} />
              Reporters
            </button>
            <button
              type="button"
              onClick={() => setManagingColumns(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Settings2 className="h-4 w-4" strokeWidth={2} />
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
              tasks={tasks.filter((t) => t.column_id === column.id).sort((a, b) => a.position - b.position)}
              onTaskClick={setSelectedTask}
              onSorted={loadTasks}
              onAddTask={() => setCreatingInColumnId(column.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1.1)' }}>
          {activeTask && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.04, rotate: 2 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-72 cursor-grabbing rounded-xl border border-indigo-300 bg-white p-3 shadow-soft-lg dark:border-indigo-500 dark:bg-slate-800"
            >
              <TaskCardContent task={activeTask} />
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>

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
      {managingReporters && <ReporterManager onClose={() => setManagingReporters(false)} />}
    </div>
  )
}
