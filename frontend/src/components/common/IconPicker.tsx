import { CaretDown, MagnifyingGlass } from '../../icons/phosphor'
import { useMemo, useRef, useState } from 'react'
import { ICON_GROUPS, iconLabel, searchIcons } from '../../icons/catalog'
import { AnchoredPopover } from './AnchoredPopover'
import { EntityIcon } from './EntityIcon'
import { IconTile } from './IconTile'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  color: string
  label: string
  disabled?: boolean
}

const PANEL_WIDTH = 296
const PANEL_HEIGHT = 340

export function IconPicker({ value, onChange, color, label, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const results = useMemo(() => searchIcons(query), [query])

  const close = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }

  const pick = (icon: string) => {
    onChange(icon)
    close()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={`${label}: ${iconLabel(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 transition hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
      >
        <IconTile icon={value} color={color} />
        <CaretDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <AnchoredPopover anchorRef={triggerRef} label={label} width={PANEL_WIDTH} height={PANEL_HEIGHT} onClose={close}>
          <div className="flex flex-col overflow-hidden rounded-xl" style={{ height: PANEL_HEIGHT }}>
            <div className="relative border-b border-slate-200 p-2 dark:border-slate-700">
              <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons…"
                aria-label="Search icons"
                className="w-full rounded-lg bg-slate-100 py-1.5 pl-8 pr-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-500/30"
              />
            </div>
            <div className="nice-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
              {results.length === 0 && <p className="p-3 text-center text-sm text-slate-400">No icons match “{query}”.</p>}
              {ICON_GROUPS.map((group) => {
                const icons = results.filter((entry) => entry.group === group)
                if (!icons.length) return null
                return (
                  <section key={group} className="mb-2 last:mb-0">
                    <h3 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</h3>
                    <div className="grid grid-cols-8 gap-0.5">
                      {icons.map((entry) => {
                        const selected = entry.key === value
                        return (
                          <button
                            key={entry.key}
                            type="button"
                            onClick={() => pick(entry.key)}
                            aria-label={entry.label}
                            aria-pressed={selected}
                            title={entry.label}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                              selected
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:ring-indigo-500/50'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                            }`}
                          >
                            <EntityIcon name={entry.key} className="h-5 w-5" />
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </AnchoredPopover>
      )}
    </>
  )
}
