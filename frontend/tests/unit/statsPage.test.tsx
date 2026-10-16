import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { statsApi, type StatsOverview } from '../../src/api/stats'
import { StatsPage } from '../../src/pages/StatsPage'

vi.mock('../../src/api/stats', () => ({ statsApi: { overview: vi.fn() } }))

const overview: StatsOverview = {
  since: '2026-06-01',
  until: '2026-06-15',
  bucket: 'week',
  open_tasks: 4,
  closed_tasks: 2,
  total_tasks: 6,
  avg_close_hours: 5,
  avg_closed_per_bucket: 1,
  total_hours_logged: 7.5,
  buckets: [{ label: 'Jun 01 – Jun 07', period_start: '2026-06-01', tasks_closed: 2, hours_logged: 7.5 }],
  by_type: [{ id: 1, label: 'Bug', icon: 'bug', color: '#ef4444', count: 2 }],
  by_priority: [],
  by_reporter: [],
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 5, 15, 10))
  vi.mocked(statsApi.overview).mockResolvedValue(overview)
})

afterEach(() => {
  vi.useRealTimers()
})

async function chooseRange(label: string) {
  await userEvent.click(screen.getByRole('button', { name: /last 90 days/i }))
  await userEvent.click(screen.getByRole('option', { name: label }))
}

describe('StatsPage', () => {
  it('loads the last 90 days by week and shows the KPIs and breakdowns', async () => {
    render(<StatsPage onBack={() => {}} />)
    await waitFor(() =>
      expect(statsApi.overview).toHaveBeenCalledWith({ since: '2026-03-18', until: undefined, bucket: 'week' }),
    )
    expect(await screen.findByText('7.5h')).toBeInTheDocument()
    expect(screen.getByText(/Bug/)).toBeInTheDocument()
    expect(screen.getAllByText('No tasks in this period.')).toHaveLength(2)
  })

  it('omits the start date for "Always"', async () => {
    render(<StatsPage onBack={() => {}} />)
    await chooseRange('Always')
    await waitFor(() =>
      expect(statsApi.overview).toHaveBeenLastCalledWith({ since: undefined, until: undefined, bucket: 'week' }),
    )
  })

  it('pre-fills a custom range from the current one', async () => {
    render(<StatsPage onBack={() => {}} />)
    await screen.findByText('7.5h')
    await chooseRange('Custom range…')
    await waitFor(() =>
      expect(statsApi.overview).toHaveBeenLastCalledWith({ since: '2026-06-01', until: '2026-06-15', bucket: 'week' }),
    )
  })

  it('shows an error when the server is unreachable', async () => {
    vi.mocked(statsApi.overview).mockRejectedValue(new Error('offline'))
    render(<StatsPage onBack={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load statistics')
  })

  it('goes back to the board', async () => {
    const onBack = vi.fn()
    render(<StatsPage onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back to board/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
