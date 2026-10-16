import { useLayoutEffect, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface AnchoredPopoverProps {
  anchorRef: RefObject<HTMLElement | null>
  label: string
  width: number
  height: number
  onClose: () => void
  children: ReactNode
  className?: string
}

const GAP = 4
const MARGIN = 8

export function AnchoredPopover({ anchorRef, label, width, height, onClose, children, className = '' }: AnchoredPopoverProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const below = rect.bottom + GAP
    const top = below + height > window.innerHeight ? Math.max(MARGIN, rect.top - GAP - height) : below
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - width - MARGIN)
    setPosition({ top, left })
  }, [anchorRef, width, height])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onClose()
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={label}
        onKeyDown={onKeyDown}
        style={{ top: position?.top ?? 0, left: position?.left ?? 0, width, visibility: position ? 'visible' : 'hidden' }}
        className={`fixed z-[71] rounded-xl border border-slate-200 bg-white shadow-soft-lg dark:border-slate-700 dark:bg-slate-800 ${className}`}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
