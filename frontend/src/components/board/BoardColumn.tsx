import { Plus } from '../../icons/phosphor'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { memo, useMemo } from 'react'
import type { BoardColumn as BoardColumnType, Task } from '../../types'
import { columnAccentClass, columnAccentColor, guessColumnIcon } from '../../utils/columnStyle'
import { IconTile } from '../common/IconTile'
import { columnDndId, taskDndId } from '../../utils/dnd'
import { AutoSortMenu } from './AutoSortMenu'
import { TaskCard } from './TaskCard'

interface BoardColumnProps {
  column: BoardColumnType
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onSorted: () => void
  onAddTask: (columnId: number) => void
}

const MAX_STAGGERED_CARDS = 8

export const BoardColumn = memo(function BoardColumn({ column, tasks, onTaskClick, onSorted, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDndId(column.id) })
  const sortableIds = useMemo(() => tasks.map((t) => taskDndId(t.id)), [tasks])

  return (
    <div
      role="region"
      aria-label={column.name}
      className={`animate-fade-up flex w-72 shrink-0 flex-col self-start rounded-2xl border-t-4 bg-white/70 shadow-soft dark:bg-slate-900/50 ${columnAccentClass(column.position)}`}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <IconTile icon={column.icon || guessColumnIcon(column.name)} color={columnAccentColor(column.position)} />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.name}</h3>
          <span className="rounded-full bg-slate-200/80 px-1.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>
        <AutoSortMenu columnId={column.id} onSorted={onSorted} />
      </div>

      <div
        ref={setNodeRef}
        className={`nice-scrollbar max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto rounded-lg p-3 transition-colors duration-200 ${
          tasks.length === 0 ? 'min-h-16' : 'min-h-40'
        } ${isOver ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onTaskClick}
              enterDelayMs={Math.min(index, MAX_STAGGERED_CARDS) * 30}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 pt-2">
        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
        >
          <Plus className="h-4 w-4" /> Add task
        </button>
      </div>
    </div>
  )
})
