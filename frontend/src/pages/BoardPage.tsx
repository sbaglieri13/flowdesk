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
import { AlertTriangle, Flag, Settings2, Tag as TagIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { tasksApi } from '../api/tasks'
import { BoardColumn } from '../components/board/BoardColumn'
import { ColumnManager } from '../components/board/ColumnManager'
import { PriorityManager } from '../components/board/PriorityManager'
import { TagManager } from '../components/board/TagManager'
import { TaskCardContent } from '../components/board/TaskCardContent'
import { SearchFilterBar, type TaskFiltersState } from '../components/common/SearchFilterBar'
import { TaskCreateModal } from '../components/task/TaskCreateModal'
import { TaskModal } from '../components/task/TaskModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useBoardData } from '../state/BoardContext'
import type { Task } from '../types'
import { parseDndId } from '../utils/dnd'
import { IMPOSSIBLE_PRIORITY_ID, IMPOSSIBLE_TAG_ID, NO_TAG_FILTER_ID } from '../utils/taskFilters'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Resolve whichever droppable the pointer is actually over first; only fall
 * back to bounding-box overlap (dnd-kit's default) when nothing is under the
 * cursor, e.g. a fast flick past a short/empty column. Using rect overlap
 * alone made the highlighted drop target frequently disagree with where the
 * pointer visually was.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

export function BoardPage() {
  const { columns, tags, priorities, loading } = useBoardData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFiltersState>({ search: '', priorityIds: [], tagIds: [] })
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [managingColumns, setManagingColumns] = useState(false)
  const [managingTags, setManagingTags] = useState(false)
  const [managingPriorities, setManagingPriorities] = useState(false)
  const [creatingInColumnId, setCreatingInColumnId] = useState<number | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)

  const visibleColumns = columns.filter((c) => !c.is_hidden)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // Only the free-text field is debounced — priority/tag filters are discrete
  // selections that should apply the instant they're picked, not after a delay.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)

  // Seeds the priority/tag filters with every id checked once board data has
  // loaded, so "select all" starts genuinely (not just visually) selected —
  // runs exactly once, otherwise it would keep re-including newly created
  // tags/priorities into a filter the user has since deliberately narrowed.
  const filtersSeededRef = useRef(false)
  useEffect(() => {
    if (loading || filtersSeededRef.current) return
    filtersSeededRef.current = true
    setFilters((prev) => ({
      ...prev,
      priorityIds: priorities.filter((p) => !p.is_hidden).map((p) => p.id),
      tagIds: [NO_TAG_FILTER_ID, ...tags.map((t) => t.id)],
    }))
  }, [loading, priorities, tags])

  const loadTasks = () => {
    tasksApi
      .list({
        search: debouncedSearch || undefined,
        // An empty array here means every priority/tag was explicitly
        // deselected, not "no filter" — omitting the param would instead
        // show everything, so an impossible id is sent to force zero
        // matches (see utils/taskFilters).
        priority_id: filters.priorityIds.length ? filters.priorityIds : [IMPOSSIBLE_PRIORITY_ID],
        tag_id: filters.tagIds.length ? filters.tagIds : [IMPOSSIBLE_TAG_ID],
      })
      .then(setTasks)
      .catch(() => setBoardError('Could not load tasks. Check the server and try again.'))
  }

  useEffect(loadTasks, [debouncedSearch, filters.priorityIds, filters.tagIds])

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
      // Move it in local state before the request resolves — otherwise the
      // card briefly renders back in its old column (still full opacity,
      // since dragging has already ended) until the response comes back.
      setTasks((prev) => prev.map((t) => (t.id === activeTask.id ? { ...t, column_id: targetColumnId } : t)))
      try {
        const updated = await tasksApi.move(activeTask.id, targetColumnId)
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } catch {
        // The optimistic move above is now wrong — reload from the server
        // rather than leave the board showing a state it never actually reached.
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
    <div className="relative flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100/50 p-4 dark:from-slate-950 dark:to-slate-900">
      {boardError && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} /> {boardError}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-stretch gap-3">
        <SearchFilterBar filters={filters} onChange={setFilters} tags={tags} priorities={priorities} />

        <div className="flex w-52 shrink-0 flex-col rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60">
          <span className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Board setup</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setManagingTags(true)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <TagIcon className="h-4 w-4" strokeWidth={2} />
              Tags
            </button>
            <button
              type="button"
              onClick={() => setManagingPriorities(true)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <Flag className="h-4 w-4" strokeWidth={2} />
              Priority
            </button>
            <button
              type="button"
              onClick={() => setManagingColumns(true)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
    </div>
  )
}
