import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import { reportersApi } from '../../src/api/reporters'
import { ReporterManager } from '../../src/components/board/ReporterManager'
import type { Reporter } from '../../src/types'
import { mockMatchMedia } from './helpers'

vi.mock('../../src/api/reporters', () => ({
  reportersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const refreshReporters = vi.fn(async () => {})
let reporters: Reporter[] = []
vi.mock('../../src/state/useBoardData', () => ({ useBoardData: () => ({ reporters, refreshReporters }) }))

const reporter = (id: number, name: string, task_count = 0): Reporter => ({ id, name, task_count })

function open() {
  const onClose = vi.fn()
  const onTasksChanged = vi.fn()
  render(<ReporterManager onClose={onClose} onTasksChanged={onTasksChanged} />)
  return { onClose, onTasksChanged }
}

beforeEach(() => {
  mockMatchMedia()
  reporters = [reporter(1, 'Ann', 3), reporter(2, 'Bob', 1), reporter(3, 'Cleo', 0)]
  refreshReporters.mockClear()
  for (const fn of Object.values(reportersApi)) vi.mocked(fn).mockReset()
})

afterEach(cleanup)

describe('ReporterManager', () => {
  it('reloads the reporters every time it opens and shows the task counts', () => {
    open()

    expect(refreshReporters).toHaveBeenCalledTimes(1)
    expect(screen.getByText('3 tasks')).toBeInTheDocument()
    expect(screen.getByText('1 task')).toBeInTheDocument()
    expect(screen.getByText('0 tasks')).toBeInTheDocument()
    expect(screen.getByText('3 total')).toBeInTheDocument()
  })

  it('shows an empty state when there are no reporters', () => {
    reporters = []
    open()

    expect(screen.getByText(/No reporters yet/)).toBeInTheDocument()
    expect(screen.queryByText(/unused/)).not.toBeInTheDocument()
  })

  it('adds a trimmed reporter name and clears the field', async () => {
    vi.mocked(reportersApi.create).mockResolvedValue(reporter(4, 'Dan'))
    open()

    const input = screen.getByLabelText('New reporter name')
    await userEvent.type(input, '  Dan  ')
    await userEvent.click(screen.getByRole('button', { name: /Add/ }))

    expect(reportersApi.create).toHaveBeenCalledWith('Dan')
    await waitFor(() => expect(input).toHaveValue(''))
    expect(refreshReporters).toHaveBeenCalledTimes(2)
  })

  it('blocks a duplicate name, ignoring case and spaces', async () => {
    open()

    await userEvent.type(screen.getByLabelText('New reporter name'), ' ann ')

    expect(screen.getByText('This reporter already exists.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add/ })).toBeDisabled()
  })

  it('shows the server error when adding fails', async () => {
    vi.mocked(reportersApi.create).mockRejectedValue(new ApiError(409, 'A reporter with this name already exists'))
    open()

    await userEvent.type(screen.getByLabelText('New reporter name'), 'Dan{Enter}')

    expect(await screen.findByText('A reporter with this name already exists')).toBeInTheDocument()
  })

  it('renames a reporter with Enter and tells the board to reload its tasks', async () => {
    vi.mocked(reportersApi.update).mockResolvedValue(reporter(1, 'Anna', 3))
    const { onTasksChanged } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Rename reporter Ann' }))
    const input = screen.getByLabelText('New name for Ann')
    await userEvent.clear(input)
    await userEvent.type(input, 'Anna{Enter}')

    expect(reportersApi.update).toHaveBeenCalledWith(1, 'Anna')
    await waitFor(() => expect(onTasksChanged).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('New name for Ann')).not.toBeInTheDocument()
  })

  it('cancels a rename with Escape without calling the API or closing the dialog', async () => {
    const { onClose } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Rename reporter Ann' }))
    await userEvent.type(screen.getByLabelText('New name for Ann'), 'zzz{Escape}')

    expect(reportersApi.update).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('New name for Ann')).not.toBeInTheDocument()
  })

  it('rejects renaming to an existing name without calling the API', async () => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Rename reporter Ann' }))
    const input = screen.getByLabelText('New name for Ann')
    await userEvent.clear(input)
    await userEvent.type(input, 'bob{Enter}')

    expect(await screen.findByText('A reporter with this name already exists')).toBeInTheDocument()
    expect(reportersApi.update).not.toHaveBeenCalled()
  })

  it('keeps the editor open and shows the error when the rename fails', async () => {
    vi.mocked(reportersApi.update).mockRejectedValue(new ApiError(500, 'Boom'))
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Rename reporter Ann' }))
    const input = screen.getByLabelText('New name for Ann')
    await userEvent.clear(input)
    await userEvent.type(input, 'Anna{Enter}')

    expect(await screen.findByText('Boom')).toBeInTheDocument()
    expect(screen.getByLabelText('New name for Ann')).toBeInTheDocument()
  })

  it('confirms before deleting and mentions how many tasks become unassigned', async () => {
    vi.mocked(reportersApi.remove).mockResolvedValue(undefined)
    const { onTasksChanged } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Delete reporter Ann' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/3 tasks set to "Ann" will become unassigned/)).toBeInTheDocument()
    expect(reportersApi.remove).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(reportersApi.remove).toHaveBeenCalledWith(1)
    await waitFor(() => expect(onTasksChanged).toHaveBeenCalledTimes(1))
  })

  it('does not delete when the confirmation is cancelled', async () => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Delete reporter Bob' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))

    expect(reportersApi.remove).not.toHaveBeenCalled()
  })

  it('shows an error when deleting fails', async () => {
    vi.mocked(reportersApi.remove).mockRejectedValue(new ApiError(500, 'Cannot delete'))
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Delete reporter Cleo' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot delete')
  })

  it('deletes only the unused reporters in bulk', async () => {
    reporters = [...reporters, reporter(4, 'Dora', 0)]
    vi.mocked(reportersApi.remove).mockResolvedValue(undefined)
    open()

    expect(screen.getByText('2 unused reporters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Delete unused/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(reportersApi.remove).toHaveBeenCalledTimes(2))
    expect(vi.mocked(reportersApi.remove).mock.calls.map(([id]) => id)).toEqual([3, 4])
  })

  it('hides the search for short lists', () => {
    open()

    expect(screen.queryByLabelText('Search reporters')).not.toBeInTheDocument()
  })

  it('filters long lists by name', async () => {
    reporters = Array.from({ length: 9 }, (_, i) => reporter(i + 1, `Person ${i + 1}`, i))
    reporters[4] = reporter(5, 'Zelda', 2)
    open()

    const search = screen.getByLabelText('Search reporters')
    await userEvent.type(search, 'zel')
    expect(screen.getByText('Zelda')).toBeInTheDocument()
    expect(screen.queryByText('Person 1')).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'nobody')
    expect(screen.getByText(/No reporter matches "nobody"/)).toBeInTheDocument()
  })
})
