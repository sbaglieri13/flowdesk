import type { ReactNode } from 'react'
import { NavBar, type View } from './NavBar'

interface AppShellProps {
  view: View
  onViewChange: (view: View) => void
  children: ReactNode
}

export function AppShell({ view, onViewChange, children }: AppShellProps) {
  return (
    <div className="flex h-full flex-col">
      <NavBar view={view} onViewChange={onViewChange} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
