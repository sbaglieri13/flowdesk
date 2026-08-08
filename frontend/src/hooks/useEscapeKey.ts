import { useEffect } from 'react'

/** Calls `onEscape` when the Escape key is pressed while this hook is mounted. */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEscape])
}
