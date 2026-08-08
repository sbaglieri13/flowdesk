import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Minimize2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFloatingPanel } from '../../hooks/useFloatingPanel'
import { Button } from '../ui/button'

interface FloatingWindowProps {
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  onClose: () => void
  ariaLabel: string
  disableEscape?: boolean
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
}

/** A modal panel that can be dragged by its header, resized from its corner, and maximized. */
export function FloatingWindow({
  header,
  footer,
  children,
  onClose,
  ariaLabel,
  disableEscape = false,
  defaultWidth = 672,
  defaultHeight = 640,
  minWidth = 380,
  minHeight = 320,
}: FloatingWindowProps) {
  const { rect, maximized, toggleMaximize, onDragPointerDown, onResizePointerDown } = useFloatingPanel({
    defaultWidth,
    defaultHeight,
    minWidth,
    minHeight,
  })

  useEscapeKey(() => {
    if (!disableEscape) onClose()
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft-lg ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
        >
          <div
            onPointerDown={onDragPointerDown}
            className="glass flex shrink-0 cursor-grab items-center gap-2 border-b px-4 py-3 active:cursor-grabbing"
          >
            <div className="min-w-0 flex-1">{header}</div>
            <div data-no-drag className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMaximize}
                aria-label={maximized ? 'Restore window size' : 'Maximize window'}
                title={maximized ? 'Restore' : 'Maximize'}
              >
                {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="nice-scrollbar flex-1 overflow-y-auto p-4">{children}</div>

          {footer && <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">{footer}</div>}

          {!maximized && (
            <div
              onPointerDown={onResizePointerDown}
              className="absolute bottom-0 right-0 h-4 w-4 touch-none cursor-nwse-resize text-slate-300 dark:text-slate-600"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" className="h-full w-full">
                <path
                  d="M13 3 3 13M13 8 8 13M13 13 13 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
