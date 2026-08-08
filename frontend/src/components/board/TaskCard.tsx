import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../../types'
import { taskDndId } from '../../utils/dnd'
import { TaskCardContent } from './TaskCardContent'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskDndId(task.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-soft-lg active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50"
    >
      <TaskCardContent task={task} />
    </div>
  )
}
