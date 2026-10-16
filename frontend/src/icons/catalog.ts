import { Circle, type Icon } from './phosphor'
import catalog from './catalog.json'
import { ICON_COMPONENTS } from './registry'

export interface IconEntry {
  key: string
  label: string
  group: string
  keywords: string
  color?: string
}

export const ICON_CATALOG: IconEntry[] = catalog
export const ICON_GROUPS = [...new Set(ICON_CATALOG.map((entry) => entry.group))]

const BY_KEY = new Map(ICON_CATALOG.map((entry) => [entry.key, entry]))

export function iconComponent(key: string | null | undefined): Icon {
  return (key && ICON_COMPONENTS[key]) || Circle
}

export function iconLabel(key: string | null | undefined): string {
  return (key && BY_KEY.get(key)?.label) || 'Icon'
}

export function suggestedColor(key: string): string | null {
  return BY_KEY.get(key)?.color ?? null
}

export function searchIcons(query: string): IconEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return ICON_CATALOG
  return ICON_CATALOG.filter((entry) => {
    const haystack = `${entry.key} ${entry.label} ${entry.keywords}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
