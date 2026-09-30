import { api } from './client'

export interface StatsBucket {
  label: string
  period_start: string
  tasks_closed: number
  hours_logged: number
}

export interface StatsBreakdownItem {
  id: number | null
  label: string
  emoji: string | null
  color: string | null
  count: number
}

export interface StatsOverview {
  since: string
  until: string
  bucket: 'day' | 'week' | 'month'
  open_tasks: number
  closed_tasks: number
  total_tasks: number
  avg_close_hours: number | null
  avg_closed_per_bucket: number
  total_hours_logged: number
  buckets: StatsBucket[]
  by_type: StatsBreakdownItem[]
  by_priority: StatsBreakdownItem[]
  by_reporter: StatsBreakdownItem[]
}

export interface StatsOverviewParams {
  since?: string
  until?: string
  bucket: 'day' | 'week' | 'month'
}

export const statsApi = {
  overview: ({ since, until, bucket }: StatsOverviewParams) => {
    const params = new URLSearchParams({ bucket })
    if (since) params.set('since', since)
    if (until) params.set('until', until)
    return api.get<StatsOverview>(`/stats/overview?${params.toString()}`)
  },
}
