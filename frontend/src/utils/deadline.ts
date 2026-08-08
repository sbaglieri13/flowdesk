import { AlertCircle, Calendar, Clock } from 'lucide-react'
import type { ComponentType } from 'react'

export type DeadlineStatus = 'overdue' | 'soon' | 'normal' | 'none'

export function getDeadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(deadline)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 2) return 'soon'
  return 'normal'
}

export const DEADLINE_BADGE_CLASSES: Record<DeadlineStatus, string> = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  normal: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  none: '',
}

export const DEADLINE_ICONS: Record<DeadlineStatus, ComponentType<{ className?: string; strokeWidth?: number }> | null> = {
  overdue: AlertCircle,
  soon: Clock,
  normal: Calendar,
  none: null,
}

export function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
