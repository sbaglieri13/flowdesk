import { Moon, Sun } from '../../icons/phosphor'
import { useTheme } from '../../state/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="flex h-9 items-center gap-1.5 overflow-hidden rounded-lg px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <span key={theme} className="animate-spin-in flex h-5 w-5 shrink-0 items-center justify-center">
        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </span>
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
