import type { CSSProperties } from 'react'
import { iconComponent } from '../../icons/catalog'

interface EntityIconProps {
  name: string | null | undefined
  className?: string
  style?: CSSProperties
}

export function EntityIcon({ name, className = 'h-4 w-4', style }: EntityIconProps) {
  const Component = iconComponent(name)
  return <Component className={className} style={style} aria-hidden="true" />
}
