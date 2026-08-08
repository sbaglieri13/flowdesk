import { Settings } from 'lucide-react'
import { ThemeToggle } from '../common/ThemeToggle'

export type View = 'board' | 'settings'

interface NavBarProps {
  view: View
  onViewChange: (view: View) => void
}

function Logo() {
  return (
    <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-glow">
      <svg viewBox="0 0 32 32" className="h-4 w-4">
        <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" fillOpacity="0.95" />
        <rect x="14" y="8" width="5" height="10" rx="1.5" fill="white" fillOpacity="0.8" />
        <rect x="21" y="8" width="5" height="13" rx="1.5" fill="white" fillOpacity="0.65" />
      </svg>
    </div>
  )
}

export function NavBar({ view, onViewChange }: NavBarProps) {
  return (
    <header className="glass sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3">
      <button
        type="button"
        onClick={() => onViewChange('board')}
        className="flex items-center gap-2.5 rounded-lg transition hover:opacity-80"
        aria-label="Go to board"
      >
        <Logo />
        <span className="font-logo text-xl font-bold text-slate-900 dark:text-slate-100">Flowdesk</span>
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onViewChange(view === 'settings' ? 'board' : 'settings')}
          aria-label="Settings"
          className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition ${
            view === 'settings'
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" strokeWidth={2} /> Settings
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
