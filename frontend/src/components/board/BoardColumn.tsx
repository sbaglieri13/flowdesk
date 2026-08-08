import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { BoardColumn as BoardColumnType, Task } from '../../types'
import { columnAccentClass, guessColumnEmoji } from '../../utils/columnStyle'
import { columnDndId, taskDndId } from '../../utils/dnd'
import { AutoSortMenu } from './AutoSortMenu'
import { TaskCard } from './TaskCard'

interface BoardColumnProps {
  column: BoardColumnType
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onSorted: () => void
  onAddTask: () => void
}

export function BoardColumn({ column, tasks, onTaskClick, onSorted, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDndId(column.id) })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex w-72 shrink-0 flex-col self-start rounded-2xl border-t-4 bg-slate-100/70 shadow-soft dark:bg-slate-900/50 ${columnAccentClass(column.position)}`}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{column.emoji || guessColumnEmoji(column.name)}</span>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{column.name}</h3>
          <span className="rounded-full bg-slate-200/80 px-1.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>
        <AutoSortMenu columnId={column.id} onSorted={onSorted} />
      </div>

      <div
        ref={setNodeRef}
        className={`nice-scrollbar max-h-[calc(100vh-220px)] min-h-40 space-y-2 overflow-y-auto rounded-lg p-3 transition-colors duration-200 ${
          isOver ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => taskDndId(t.id))} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.03 } }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <TaskCard task={task} onClick={() => onTaskClick(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>

      <div className="p-3 pt-2">
        <button
          type="button"
          onClick={onAddTask}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} /> Add task
        </button>
      </div>
    </motion.div>
  )
}
