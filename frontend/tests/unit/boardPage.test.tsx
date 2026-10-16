import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasksApi } from '../../src/api/tasks'
import { BoardPage } from '../../src/pages/BoardPage'
import type { Tag, Task } from '../../src/types'

vi.mock('../../src/api/tasks', () => ({ tasksApi: { list: vi.fn() } }))

const boardData = vi.hoisted(() => ({
  columns: [{ id: 1, name: 'New', icon: 'tray', position: 0, is_hidden: false, is_default: true }],
  tags: [] as Tag[],
  priorities: [{ id: 1, name: 'Medium', icon: 'minus', color: '#000', position: 0, is_hidden: false }],
  taskTypes: [],
  reporters: [],
  settings: { external_reference_base_url: '' },
  loading: false,
}))

vi.mock('../../src/state/useBoardData', () => ({ useBoardData: () => boardData }))

vi.mock('../../src/components/task/TaskModal', () => ({
  TaskModal: ({ task, onUpdated }: { task: Task; onUpdated: (task: Task) => void }) => (
    <button onClick={() => onUpdated({ ...task, title: 'Edited locally' })}>apply edit</button>
  ),
}))

function task(id: number, title: string): Task {
  return {
    id,
    title,
    display_code: `FD-${id}`,
    column_id: 1,
    position: id,
    priority: { id: 1, name: 'Medium', icon: 'minus', color: '#000' },
    type: null,
    reporter: null,
    deadline: null,
    tags: [],
    checklist_items: [],
    attachments: [],
    time_entries: [],
    doc_urls: [],
    total_hours: 0,
  } as unknown as Task
}

beforeEach(() => {
  boardData.tags = []
  vi.mocked(tasksApi.list).mockReset()
})

describe('BoardPage', () => {
  it('loads tasks once on mount, already using every filter option', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue([task(1, 'Only task')])
    render(<BoardPage />)

    expect(await screen.findByText('Only task')).toBeInTheDocument()
    expect(tasksApi.list).toHaveBeenCalledTimes(1)
    expect(tasksApi.list).toHaveBeenCalledWith({
      search: undefined,
      priority_id: [1],
      tag_id: [-1],
      type_id: [-1],
      reporter_id: [-1],
    })
  })

  it('ignores a slow, outdated task list that arrives after a newer one', async () => {
    let resolveStale: (tasks: Task[]) => void = () => {}
    vi.mocked(tasksApi.list)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveStale = resolve)))
      .mockResolvedValue([task(2, 'Fresh result')])

    render(<BoardPage />)
    await userEvent.type(screen.getByLabelText('Search tasks'), 'fresh')
    expect(await screen.findByText('Fresh result')).toBeInTheDocument()

    await act(async () => resolveStale([task(1, 'Stale result')]))
    expect(screen.queryByText('Stale result')).not.toBeInTheDocument()
    expect(screen.getByText('Fresh result')).toBeInTheDocument()
  })

  it('does not let a task list requested before a local edit overwrite that edit', async () => {
    let resolveInFlight: (tasks: Task[]) => void = () => {}
    vi.mocked(tasksApi.list)
      .mockResolvedValueOnce([task(1, 'Original')])
      .mockImplementationOnce(() => new Promise((resolve) => (resolveInFlight = resolve)))
      .mockResolvedValue([task(1, 'Edited on the server')])

    render(<BoardPage />)
    await userEvent.click(await screen.findByText('Original'))
    await userEvent.type(screen.getByLabelText('Search tasks'), 'o')
    await waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(2))

    await userEvent.click(await screen.findByRole('button', { name: 'apply edit' }))
    expect(screen.getByText('Edited locally')).toBeInTheDocument()

    await act(async () => resolveInFlight([task(1, 'Original')]))

    expect(await screen.findByText('Edited on the server')).toBeInTheDocument()
    expect(screen.queryByText('Original')).not.toBeInTheDocument()
    expect(tasksApi.list).toHaveBeenCalledTimes(3)
  })

  it('includes tags created later in the active filters', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue([])
    const { rerender } = render(<BoardPage />)
    await waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(1))

    boardData.tags = [{ id: 7, name: 'new tag', color: '#000', icon: 'tag' } as Tag]
    rerender(<BoardPage />)

    await waitFor(() => expect(vi.mocked(tasksApi.list).mock.lastCall?.[0]?.tag_id).toEqual([-1, 7]))
  })
})
