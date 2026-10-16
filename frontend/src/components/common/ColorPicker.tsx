import { Check, Eraser } from '../../icons/phosphor'
import { useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { hexToHsv, hsvToHex, normalizeHex, type Hsv } from '../../utils/color'
import { TAG_SWATCHES } from '../../utils/tagColors'

interface ColorPickerProps {
  onPick: (hex: string) => void
  initialColor?: string | null
  selected?: string | null
  onReset?: () => void
  resetLabel?: string
  swatchLabel?: (hex: string) => string
}

const INITIAL_COLOR = '#7e22ce'
const HUE_GRADIENT = 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'

function clamp(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n))
}

function trackPointer(e: ReactPointerEvent<HTMLElement>, onMove: (x: number, y: number) => void) {
  e.preventDefault()
  const rect = e.currentTarget.getBoundingClientRect()
  const update = (ev: { clientX: number; clientY: number }) =>
    onMove(clamp((ev.clientX - rect.left) / rect.width), clamp((ev.clientY - rect.top) / rect.height))
  update(e)
  const stop = () => {
    window.removeEventListener('pointermove', update)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', update)
  window.addEventListener('pointerup', stop)
}

function arrowDelta(e: KeyboardEvent, step: number): [number, number] | null {
  const amount = e.shiftKey ? step * 10 : step
  const deltas: Record<string, [number, number]> = {
    ArrowLeft: [-amount, 0],
    ArrowRight: [amount, 0],
    ArrowUp: [0, amount],
    ArrowDown: [0, -amount],
  }
  return deltas[e.key] ?? null
}

export function ColorPicker({
  onPick,
  initialColor,
  selected,
  onReset,
  resetLabel = 'Remove color',
  swatchLabel = (hex) => `Choose color ${hex}`,
}: ColorPickerProps) {
  const startColor = (initialColor && normalizeHex(initialColor)) || INITIAL_COLOR
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(startColor))
  const [hexInput, setHexInput] = useState(startColor)
  const picked = normalizeHex(hexInput)

  const updateHsv = (next: Hsv) => {
    setHsv(next)
    setHexInput(hsvToHex(next))
  }

  const onHexChange = (raw: string) => {
    setHexInput(raw)
    const hex = normalizeHex(raw)
    if (!hex) return
    const next = hexToHsv(hex)
    setHsv(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next)
  }

  const onAreaKeyDown = (e: KeyboardEvent) => {
    const delta = arrowDelta(e, 0.01)
    if (!delta) return
    e.preventDefault()
    updateHsv({ ...hsv, s: clamp(hsv.s + delta[0]), v: clamp(hsv.v + delta[1]) })
  }

  const onHueKeyDown = (e: KeyboardEvent) => {
    const delta = arrowDelta(e, 1)
    if (!delta) return
    e.preventDefault()
    updateHsv({ ...hsv, h: clamp(hsv.h + delta[0] + delta[1], 0, 360) })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {TAG_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(swatch)}
            className={`h-5 w-5 rounded-full transition ${
              selected === swatch ? 'ring-2 ring-slate-400 ring-offset-1 dark:ring-offset-slate-800' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: swatch }}
            aria-label={swatchLabel(swatch)}
            aria-pressed={selected === swatch}
          />
        ))}
        {onReset && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onReset}
            title="Default color"
            aria-label={resetLabel}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:scale-110 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Eraser className="h-3 w-3" />
          </button>
        )}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onPointerDown={(e) => trackPointer(e, (x, y) => updateHsv({ ...hsv, s: x, v: 1 - y }))}
        onKeyDown={onAreaKeyDown}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }}
        />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onPointerDown={(e) => trackPointer(e, (x) => updateHsv({ ...hsv, h: x * 360 }))}
        onKeyDown={onHueKeyDown}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        style={{ backgroundImage: HUE_GRADIENT }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="h-7 w-7 shrink-0 rounded-md border border-slate-200 dark:border-slate-600"
          style={{ backgroundColor: picked ?? hsvToHex(hsv) }}
          aria-hidden="true"
        />
        <input
          value={hexInput}
          onChange={(e) => onHexChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && picked) {
              e.preventDefault()
              onPick(picked)
            }
          }}
          spellCheck={false}
          maxLength={7}
          aria-label="Hex color code"
          aria-invalid={!picked}
          className={`min-w-0 flex-1 rounded-md border bg-white px-2 py-1 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-200 ${
            picked
              ? 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-600 dark:focus:ring-indigo-500/20'
              : 'border-red-300 focus:ring-red-100 dark:border-red-500/50'
          }`}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => picked && onPick(picked)}
          disabled={!picked}
          className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Apply
        </button>
      </div>
    </div>
  )
}
