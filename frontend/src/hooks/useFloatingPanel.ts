import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface UseFloatingPanelOptions {
  defaultWidth: number
  defaultHeight: number
  minWidth?: number
  minHeight?: number
}

const VIEWPORT_MARGIN = 16
const MIN_VISIBLE = 160

function initialRect(defaultWidth: number, defaultHeight: number): Rect {
  const width = Math.min(defaultWidth, window.innerWidth - VIEWPORT_MARGIN * 2)
  const height = Math.min(defaultHeight, window.innerHeight - VIEWPORT_MARGIN * 2)
  return {
    width,
    height,
    left: Math.max(VIEWPORT_MARGIN, (window.innerWidth - width) / 2),
    top: Math.max(VIEWPORT_MARGIN, (window.innerHeight - height) / 2),
  }
}

export function useFloatingPanel({ defaultWidth, defaultHeight, minWidth = 320, minHeight = 220 }: UseFloatingPanelOptions) {
  const [rect, setRect] = useState<Rect>(() => initialRect(defaultWidth, defaultHeight))
  const [maximized, setMaximized] = useState(false)
  const beforeMaximize = useRef<Rect | null>(null)

  const clamp = useCallback(
    (next: Rect): Rect => {
      const width = Math.min(Math.max(next.width, minWidth), window.innerWidth - VIEWPORT_MARGIN * 2)
      const height = Math.min(Math.max(next.height, minHeight), window.innerHeight - VIEWPORT_MARGIN * 2)
      const left = Math.min(Math.max(next.left, -width + MIN_VISIBLE), window.innerWidth - MIN_VISIBLE)
      const top = Math.min(Math.max(next.top, 0), window.innerHeight - 48)
      return { left, top, width, height }
    },
    [minWidth, minHeight],
  )

  const onDragPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (maximized) return
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, button, a, [data-no-drag]')) return

    const startX = e.clientX
    const startY = e.clientY
    const startLeft = rect.left
    const startTop = rect.top

    const move = (ev: PointerEvent) => {
      setRect((prev) => clamp({ ...prev, left: startLeft + (ev.clientX - startX), top: startTop + (ev.clientY - startY) }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (maximized) return
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = rect.width
    const startHeight = rect.height

    const move = (ev: PointerEvent) => {
      setRect((prev) =>
        clamp({ ...prev, width: startWidth + (ev.clientX - startX), height: startHeight + (ev.clientY - startY) }),
      )
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const toggleMaximize = () => {
    setMaximized((prev) => {
      if (!prev) {
        beforeMaximize.current = rect
        setRect({
          left: VIEWPORT_MARGIN,
          top: VIEWPORT_MARGIN,
          width: window.innerWidth - VIEWPORT_MARGIN * 2,
          height: window.innerHeight - VIEWPORT_MARGIN * 2,
        })
      } else if (beforeMaximize.current) {
        setRect(beforeMaximize.current)
      }
      return !prev
    })
  }

  return { rect, maximized, toggleMaximize, onDragPointerDown, onResizePointerDown }
}
