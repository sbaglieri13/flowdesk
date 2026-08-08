import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFloatingPanel } from '../../hooks/useFloatingPanel'
import { Button } from '../ui/button'

interface ModalBackdropProps {
  onClose: () => void
  children: ReactNode
  title?: string
  /** Set while a nested dialog (e.g. a delete confirmation) is open, so Escape
   * dismisses that first instead of also closing this modal underneath it. */
  disableEscape?: boolean
}

export function ModalBackdrop({ onClose, children, title, disableEscape = false }: ModalBackdropProps) {
  const stopPropagation = (e: MouseEvent) => e.stopPropagation()
  const panelRef = useRef<HTMLDivElement>(null)
  const { rect, maximized, toggleMaximize, onDragPointerDown, onResizePointerDown } = useFloatingPanel({
    defaultWidth: 560,
    defaultHeight: 600,
    minWidth: 380,
    minHeight: 280,
  })

  useEscapeKey(() => {
    if (!disableEscape) onClose()
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        ref={panelRef}
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft-lg outline-none ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
      >
        <div
          onPointerDown={onDragPointerDown}
          className="glass flex shrink-0 cursor-grab items-center justify-end gap-1 rounded-t-2xl border-b px-2 py-1 active:cursor-grabbing"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMaximize}
            className="h-7 w-7"
            aria-label={maximized ? 'Restore window size' : 'Maximize window'}
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="nice-scrollbar flex-1 overflow-y-auto p-5">{children}</div>

        {!maximized && (
          <div
            onPointerDown={onResizePointerDown}
            className="absolute bottom-0 right-0 h-4 w-4 touch-none cursor-nwse-resize text-slate-300 dark:text-slate-600"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="h-full w-full">
              <path d="M13 3 3 13M13 8 8 13M13 13 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
