import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Hex color: renders a soft tinted pill (text = color, background = color at low opacity). */
  color?: string
}

export function Badge({ color, className, style, ...props }: BadgeProps) {
  const colorStyle: CSSProperties | undefined = color
    ? { backgroundColor: `${color}1f`, color, ...style }
    : style

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        !color && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
      style={colorStyle}
      {...props}
    />
  )
}
