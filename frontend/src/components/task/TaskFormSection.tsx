import type { ReactNode } from 'react'

interface TaskFormSectionProps {
  children: ReactNode
}

export function TaskFormSection({ children }: TaskFormSectionProps) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      {children}
    </div>
  )
}
