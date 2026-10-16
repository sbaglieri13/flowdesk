import type { CSSProperties } from 'react'
import { EntityIcon } from './EntityIcon'

interface IconTileProps {
  icon: string | null | undefined
  color: string
  size?: 'sm' | 'md'
  title?: string
}

const SIZES = {
  sm: { box: 'h-5 w-5 rounded-md', icon: 'h-3.5 w-3.5' },
  md: { box: 'h-6 w-6 rounded-lg', icon: 'h-4 w-4' },
}

export function IconTile({ icon, color, size = 'md', title }: IconTileProps) {
  return (
    <span
      className={`icon-tile inline-flex shrink-0 items-center justify-center ${SIZES[size].box}`}
      style={{ '--tile-color': color } as CSSProperties}
      title={title}
    >
      <EntityIcon name={icon} className={SIZES[size].icon} />
    </span>
  )
}
