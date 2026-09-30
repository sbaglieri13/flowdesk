import { useState } from 'react'

interface BarTrendChartProps {
  data: { label: string; value: number }[]
  color: string
  formatValue?: (value: number) => string
  emptyMessage?: string
}

const VIEW_WIDTH = 600
const VIEW_HEIGHT = 200
const PAD_LEFT = 34
const PAD_RIGHT = 8
const PAD_TOP = 10
const PAD_BOTTOM = 22

function niceMax(max: number): number {
  if (max <= 0) return 4
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const residual = max / magnitude
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  return niceResidual * magnitude
}

export function BarTrendChart({ data, color, formatValue = (v) => String(v), emptyMessage }: BarTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const hasData = data.length > 0
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const chartWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT
  const chartHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM
  const bandWidth = hasData ? chartWidth / data.length : chartWidth
  const barWidth = Math.max(2, Math.min(24, bandWidth - 3))
  const labelEvery = hasData ? Math.max(1, Math.ceil(data.length / 8)) : 1
  const ticks = [0, max / 2, max]

  const yFor = (value: number) => PAD_TOP + chartHeight * (1 - (max === 0 ? 0 : value / max))

  if (!hasData) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        {emptyMessage ?? 'No data for this period.'}
      </div>
    )
  }

  const active = activeIndex !== null ? data[activeIndex] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full" aria-hidden="true">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={VIEW_WIDTH - PAD_RIGHT}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6}
              y={yFor(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400 text-[9px] dark:fill-slate-500"
            >
              {Math.round(tick * 100) / 100}
            </text>
          </g>
        ))}

        {data.map((point, index) => {
          const bandX = PAD_LEFT + index * bandWidth
          const barX = bandX + (bandWidth - barWidth) / 2
          const barTop = yFor(point.value)
          const barHeight = Math.max(0, PAD_TOP + chartHeight - barTop)
          const radius = Math.min(4, barWidth / 2)
          const showLabel = index % labelEvery === 0

          return (
            <g key={point.label}>
              <rect
                x={barX}
                y={barHeight === 0 ? PAD_TOP + chartHeight - 1 : barTop}
                width={barWidth}
                height={barHeight === 0 ? 1 : barHeight}
                rx={radius}
                ry={radius}
                fill={color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                className="transition-opacity duration-100"
              />
              {showLabel && (
                <text
                  x={bandX + bandWidth / 2}
                  y={VIEW_HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px] dark:fill-slate-500"
                >
                  {point.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="absolute inset-x-0 top-0 flex" style={{ height: `${((PAD_TOP + chartHeight) / VIEW_HEIGHT) * 100}%` }}>
        {data.map((point, index) => (
          <button
            key={point.label}
            type="button"
            className="h-full flex-1 cursor-default"
            style={{ paddingLeft: index === 0 ? `${(PAD_LEFT / VIEW_WIDTH) * 100}%` : 0 }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex((prev) => (prev === index ? null : prev))}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex((prev) => (prev === index ? null : prev))}
            aria-label={`${point.label}: ${formatValue(point.value)}`}
          />
        ))}
      </div>

      {active && activeIndex !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-soft-lg dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: `${((activeIndex + 0.5) / data.length) * ((chartWidth / VIEW_WIDTH) * 100) + (PAD_LEFT / VIEW_WIDTH) * 100}%`,
            top: `${(yFor(active.value) / VIEW_HEIGHT) * 100}%`,
          }}
        >
          <div className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(active.value)}</div>
          <div className="text-slate-500 dark:text-slate-400">{active.label}</div>
        </div>
      )}
    </div>
  )
}
