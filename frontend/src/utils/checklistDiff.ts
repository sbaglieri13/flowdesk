import { checklistApi } from '../api/checklist'
import type { ChecklistItem } from '../types'

/** Items added in the editor before saving get a negative id until the server assigns a real one. */
export function isDraftChecklistItem(item: ChecklistItem): boolean {
  return item.id < 0
}

export function checklistChanged(original: ChecklistItem[], draft: ChecklistItem[]): boolean {
  if (original.length !== draft.length) return true
  return original.some((o, i) => o.id !== draft[i].id || o.text !== draft[i].text || o.is_done !== draft[i].is_done)
}

/** Applies the difference between the saved checklist and the edited draft through the per-item API. */
export async function saveChecklistChanges(
  taskId: number,
  original: ChecklistItem[],
  draft: ChecklistItem[],
): Promise<void> {
  const draftIds = new Set(draft.map((i) => i.id))
  const originalById = new Map(original.map((i) => [i.id, i]))

  for (const item of original) {
    if (!draftIds.has(item.id)) await checklistApi.remove(taskId, item.id)
  }

  const finalOrder: number[] = []
  for (const item of draft) {
    if (isDraftChecklistItem(item)) {
      const created = await checklistApi.create(taskId, item.text)
      if (item.is_done) await checklistApi.update(taskId, created.id, { is_done: true })
      finalOrder.push(created.id)
      continue
    }
    const before = originalById.get(item.id)
    const patch: { text?: string; is_done?: boolean } = {}
    if (before && before.text !== item.text) patch.text = item.text
    if (before && before.is_done !== item.is_done) patch.is_done = item.is_done
    if (Object.keys(patch).length) await checklistApi.update(taskId, item.id, patch)
    finalOrder.push(item.id)
  }

  // The server keeps surviving items in their old order and appends new ones,
  // so only call reorder when the draft order actually differs from that.
  const keptInOriginalOrder = original.filter((i) => draftIds.has(i.id)).map((i) => i.id)
  const newlyCreated = finalOrder.filter((id) => !originalById.has(id))
  const serverOrder = [...keptInOriginalOrder, ...newlyCreated]
  if (finalOrder.some((id, i) => id !== serverOrder[i])) await checklistApi.reorder(taskId, finalOrder)
}
