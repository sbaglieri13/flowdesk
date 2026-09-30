import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock,
  Flag,
  Layers,
  Shapes,
  Timer,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { statsApi, type StatsOverview } from '../api/stats'
import { BarTrendChart } from '../components/stats/BarTrendChart'
import { BreakdownList } from '../components/stats/BreakdownList'
import { StatTile } from '../components/stats/StatTile'
import { Listbox, type ListboxOption } from '../components/common/Listbox'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { DateField } from '../components/task/DateField'

type RangeMode = 30 | 90 | 180 | 365 | 'always' | 'custom'
type Bucket = 'day' | 'week' | 'month'

const RANGE_OPTIONS: ListboxOption<RangeMode>[] = [
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 12 months' },
  { value: 'always', label: 'Always' },
  { value: 'custom', label: 'Custom range…' },
]

const BUCKET_OPTIONS: ListboxOption<Bucket>[] = [
  { value: 'day', label: 'By day' },
  { value: 'week', label: 'By week' },
  { value: 'month', label: 'By month' },
]

function formatHours(hours: number): string {
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`
}

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRangeHint(since: string, until: string): string {
  return since === until ? `on ${formatShortDate(since)}` : `${formatShortDate(since)} – ${formatShortDate(until)}`
}

interface StatsPageProps {
  onBack: () => void
}

export function StatsPage({ onBack }: StatsPageProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>(90)
  const [customFrom, setCustomFrom] = useState<string | null>(null)
  const [customTo, setCustomTo] = useState<string | null>(null)
  const [bucket, setBucket] = useState<Bucket>('week')
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleRangeChange = (mode: RangeMode) => {
    if (mode === 'custom' && (!customFrom || !customTo)) {
      setCustomFrom(overview?.since ?? daysAgoIso(90))
      setCustomTo(overview?.until ?? daysAgoIso(1))
    }
    setRangeMode(mode)
  }

  const customRangeIncomplete = rangeMode === 'custom' && (!customFrom || !customTo)

  useEffect(() => {
    if (customRangeIncomplete) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const since = rangeMode === 'always' ? undefined : rangeMode === 'custom' ? customFrom! : daysAgoIso(rangeMode)
    const until = rangeMode === 'custom' ? customTo! : undefined
    statsApi
      .overview({ since, until, bucket })
      .then((data) => {
        if (!cancelled) setOverview(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load statistics. Check the server and try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeMode, customFrom, customTo, bucket, customRangeIncomplete])

  return (
    <div className="nice-scrollbar h-full overflow-y-auto bg-gradient-to-br from-indigo-100/70 via-slate-100 to-slate-200/70 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to board
        </Button>

        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-500" strokeWidth={2} />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Productivity statistics</h1>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Date range</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Listbox value={rangeMode} onChange={handleRangeChange} options={RANGE_OPTIONS} />
            </div>
            {rangeMode === 'custom' && (
              <>
                <div className="w-36">
                  <DateField value={customFrom} onChange={setCustomFrom} placeholder="From" />
                </div>
                <span className="text-sm text-slate-400" aria-hidden="true">
                  –
                </span>
                <div className="w-36">
                  <DateField value={customTo} onChange={setCustomTo} placeholder="To" />
                </div>
              </>
            )}
            <div className="w-32">
              <Listbox value={bucket} onChange={setBucket} options={BUCKET_OPTIONS} icon={Layers} />
            </div>
          </div>
          {customRangeIncomplete && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Pick both a start and end date.</p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} /> {error}
          </div>
        )}

        <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {overview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile icon={Timer} label="Open tasks" value={String(overview.open_tasks)} />
                <StatTile
                  icon={CheckCircle2}
                  label="Closed"
                  value={String(overview.closed_tasks)}
                  hint={formatRangeHint(overview.since, overview.until)}
                />
                <StatTile
                  icon={Clock}
                  label="Hours logged"
                  value={formatHours(overview.total_hours_logged)}
                  hint={formatRangeHint(overview.since, overview.until)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tasks closed</h2>
                  <BarTrendChart
                    data={overview.buckets.map((b) => ({ label: b.label, value: b.tasks_closed }))}
                    color="#a855f7"
                    formatValue={(v) => `${v} task${v === 1 ? '' : 's'}`}
                    emptyMessage="No tasks closed in this period."
                  />
                </Card>
                <Card className="p-4">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Hours logged</h2>
                  <BarTrendChart
                    data={overview.buckets.map((b) => ({ label: b.label, value: b.hours_logged }))}
                    color="#7e22ce"
                    formatValue={formatHours}
                    emptyMessage="No hours logged in this period."
                  />
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="p-4">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Shapes className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} /> By type
                  </h2>
                  <BreakdownList items={overview.by_type} />
                </Card>
                <Card className="p-4">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Flag className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} /> By priority
                  </h2>
                  <BreakdownList items={overview.by_priority} />
                </Card>
                <Card className="p-4">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <UserRound className="h-3.5 w-3.5 text-indigo-500" strokeWidth={2} /> By reporter
                  </h2>
                  <BreakdownList items={overview.by_reporter} />
                </Card>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500">
                "By type/priority/reporter" reflect all tasks on the board, regardless of the period selected above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
