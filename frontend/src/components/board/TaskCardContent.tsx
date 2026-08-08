import { CheckCircle2, ListChecks } from 'lucide-react'
import { useBoardData } from '../../state/BoardContext'
import type { Task } from '../../types'
import { DEADLINE_BADGE_CLASSES, DEADLINE_ICONS, formatDeadline, getDeadlineStatus } from '../../utils/deadline'
import { Badge } from '../ui/badge'

export function TaskCardContent({ task }: { task: Task }) {
  const { tags: allTags } = useBoardData()
  const deadlineStatus = getDeadlineStatus(task.deadline)
  const DeadlineIcon = DEADLINE_ICONS[deadlineStatus]
  const doneCount = task.checklist_items.filter((i) => i.is_done).length
  const allDone = task.checklist_items.length > 0 && doneCount === task.checklist_items.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 font-mono text-[11px] font-semibold text-indigo-500">{task.display_code}</span>
          {task.external_reference && (
            <>
              <span className="shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true">
                ·
              </span>
              <span
                className="truncate font-mono text-[11px] font-semibold text-violet-500 dark:text-violet-300"
                title={task.external_reference}
              >
                {task.external_reference}
              </span>
            </>
          )}
        </div>
        <Badge color={task.priority.color} className="shrink-0">
          {task.priority.emoji} {task.priority.name}
        </Badge>
      </div>

      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{task.title}</p>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => {
            // Prefer the live tag from board state — the task's own copy goes
            // stale (old color/name/emoji) until the task itself is refetched.
            const liveTag = allTags.find((t) => t.id === tag.id) ?? tag
            return (
              <Badge key={tag.id} color={liveTag.color} className="text-[10px]">
                {liveTag.emoji ? `${liveTag.emoji} ` : ''}
                {liveTag.name}
              </Badge>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px]">
        {task.deadline && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${DEADLINE_BADGE_CLASSES[deadlineStatus]}`}>
            {DeadlineIcon && <DeadlineIcon className="h-3 w-3" strokeWidth={2.5} />}
            {formatDeadline(task.deadline)}
          </span>
        )}
        {task.checklist_items.length > 0 && (
          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            {allDone ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
            ) : (
              <ListChecks className="h-3 w-3" strokeWidth={2.25} />
            )}
            {doneCount}/{task.checklist_items.length}
          </span>
        )}
      </div>
    </div>
  )
}
