/**
 * dnd-kit requires every draggable/droppable id to be unique across the
 * whole DndContext. Columns and tasks are separate auto-increment sequences
 * in the database, so their raw numeric ids can collide (e.g. column #1 and
 * task #1 both existing) — namespacing them here removes that ambiguity.
 */

export type DndId = `column-${number}` | `task-${number}`

export function columnDndId(id: number): DndId {
  return `column-${id}`
}

export function taskDndId(id: number): DndId {
  return `task-${id}`
}

interface ParsedDndId {
  type: 'column' | 'task'
  id: number
}

export function parseDndId(raw: string | number): ParsedDndId | null {
  const [type, rawId] = String(raw).split('-')
  if (type !== 'column' && type !== 'task') return null
  const id = Number(rawId)
  return Number.isNaN(id) ? null : { type, id }
}
