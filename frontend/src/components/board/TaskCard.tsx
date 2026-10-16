import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo } from 'react'
import type { Task } from '../../types'
import { taskDndId } from '../../utils/dnd'
import { TaskCardContent } from './TaskCardContent'

interface TaskCardProps {
  task: Task
  onOpen: (task: Task) => void
  enterDelayMs?: number
}

export const TaskCard = memo(function TaskCard({ task, onOpen, enterDelayMs = 0 }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskDndId(task.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    animationDelay: enterDelayMs ? `${enterDelayMs}ms` : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task)
      }}
      className="animate-fade-up group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-soft transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-soft-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50"
    >
      <TaskCardContent task={task} />
    </div>
  )
})
