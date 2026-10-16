import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checklistApi } from '../../src/api/checklist'
import { timeEntriesApi } from '../../src/api/timeEntries'
import type { ChecklistItem, TimeEntry } from '../../src/types'
import { checklistChanged, saveChecklistChanges } from '../../src/utils/checklistDiff'
import { saveTimeEntryChanges, timeEntriesChanged } from '../../src/utils/timeEntryDiff'

vi.mock('../../src/api/checklist', () => ({
  checklistApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn(), reorder: vi.fn() },
}))
vi.mock('../../src/api/timeEntries', () => ({
  timeEntriesApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const item = (id: number, text: string, is_done = false): ChecklistItem =>
  ({ id, text, is_done, position: id }) as ChecklistItem
const entry = (id: number, hours: number, note: string | null = null, logged_date = '2026-01-01'): TimeEntry =>
  ({ id, hours, note, logged_date, created_at: '' }) as TimeEntry

beforeEach(() => {
  vi.mocked(checklistApi.create).mockImplementation(async (_taskId, text) => item(100, text))
})

describe('checklistChanged', () => {
  const original = [item(1, 'a'), item(2, 'b')]

  it('is false for an identical list', () => {
    expect(checklistChanged(original, [item(1, 'a'), item(2, 'b')])).toBe(false)
  })

  it.each([
    ['text edit', [item(1, 'A'), item(2, 'b')]],
    ['toggle', [item(1, 'a', true), item(2, 'b')]],
    ['reorder', [item(2, 'b'), item(1, 'a')]],
    ['removal', [item(1, 'a')]],
    ['addition', [item(1, 'a'), item(2, 'b'), item(-1, 'c')]],
  ])('detects a %s', (_label, draft) => {
    expect(checklistChanged(original, draft)).toBe(true)
  })
})

describe('saveChecklistChanges', () => {
  it('sends only the minimal set of API calls', async () => {
    const original = [item(1, 'keep'), item(2, 'edit me'), item(3, 'delete me')]
    const draft = [item(1, 'keep'), item(2, 'edited', true), item(-1, 'new', true)]

    await saveChecklistChanges(7, original, draft)

    expect(checklistApi.remove).toHaveBeenCalledExactlyOnceWith(7, 3)
    expect(checklistApi.update).toHaveBeenCalledWith(7, 2, { text: 'edited', is_done: true })
    expect(checklistApi.create).toHaveBeenCalledExactlyOnceWith(7, 'new')
    expect(checklistApi.update).toHaveBeenCalledWith(7, 100, { is_done: true })
    expect(checklistApi.update).not.toHaveBeenCalledWith(7, 1, expect.anything())
    expect(checklistApi.reorder).not.toHaveBeenCalled()
  })

  it('reorders only when the order actually changed', async () => {
    await saveChecklistChanges(7, [item(1, 'a'), item(2, 'b')], [item(2, 'b'), item(1, 'a')])
    expect(checklistApi.reorder).toHaveBeenCalledExactlyOnceWith(7, [2, 1])
  })
})

describe('timeEntriesChanged', () => {
  const original = [entry(1, 2, 'x')]

  it('is false when nothing changed, in any order', () => {
    expect(timeEntriesChanged(original, [entry(1, 2, 'x')])).toBe(false)
  })

  it.each([
    ['hours', [entry(1, 3, 'x')]],
    ['note', [entry(1, 2, 'y')]],
    ['date', [entry(1, 2, 'x', '2026-02-02')]],
    ['new entry', [entry(1, 2, 'x'), entry(-1, 1)]],
    ['removal', []],
  ])('detects a changed %s', (_label, draft) => {
    expect(timeEntriesChanged(original, draft)).toBe(true)
  })
})

describe('saveTimeEntryChanges', () => {
  it('creates, patches and deletes exactly what changed', async () => {
    const original = [entry(1, 2, 'same'), entry(2, 1, 'old'), entry(3, 4)]
    const draft = [entry(1, 2, 'same'), entry(2, 1.5, 'new'), entry(-5, 0.5, 'fresh', '2026-03-03')]

    await saveTimeEntryChanges(9, original, draft)

    expect(timeEntriesApi.remove).toHaveBeenCalledExactlyOnceWith(9, 3)
    expect(timeEntriesApi.update).toHaveBeenCalledExactlyOnceWith(9, 2, { hours: 1.5, note: 'new' })
    expect(timeEntriesApi.create).toHaveBeenCalledExactlyOnceWith(9, {
      hours: 0.5,
      note: 'fresh',
      logged_date: '2026-03-03',
    })
  })
})
