import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../state/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="flex h-9 items-center gap-1.5 overflow-hidden rounded-lg px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={prefersReducedMotion ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? undefined : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex h-5 w-5 shrink-0 items-center justify-center"
        >
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
