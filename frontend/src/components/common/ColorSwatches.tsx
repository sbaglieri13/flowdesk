import { useRef, useState } from 'react'
import { TAG_SWATCHES } from '../../utils/tagColors'
import { AnchoredPopover } from './AnchoredPopover'
import { ColorPicker } from './ColorPicker'

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

const RAINBOW = 'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #6366f1, #a855f7, #ec4899, #ef4444)'
const selectedRing = 'ring-2 ring-slate-400 ring-offset-1 dark:ring-offset-slate-800'

export function ColorSwatches({ value, onChange, disabled }: ColorSwatchesProps) {
  const [open, setOpen] = useState(false)
  const customRef = useRef<HTMLButtonElement>(null)
  const normalized = value.toLowerCase()
  const isCustom = !TAG_SWATCHES.includes(normalized)

  const close = () => {
    setOpen(false)
    customRef.current?.focus()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TAG_SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          disabled={disabled}
          className={`h-5 w-5 shrink-0 rounded-full transition disabled:opacity-50 ${
            normalized === swatch ? selectedRing : 'hover:scale-110'
          }`}
          style={{ backgroundColor: swatch }}
          aria-label={`Choose color ${swatch}`}
          aria-pressed={normalized === swatch}
        />
      ))}
      <button
        ref={customRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Custom color"
        aria-label={isCustom ? `Custom color ${normalized}` : 'Custom color'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={isCustom}
        className={`relative h-5 w-5 shrink-0 rounded-full transition disabled:opacity-50 ${isCustom ? selectedRing : 'hover:scale-110'}`}
        style={{ background: RAINBOW }}
      >
        {isCustom && (
          <span
            className="absolute inset-[3px] rounded-full ring-1 ring-white/70"
            style={{ backgroundColor: normalized }}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <AnchoredPopover anchorRef={customRef} label="Custom color" width={256} height={260} onClose={close} className="p-2.5">
          <ColorPicker
            initialColor={value}
            selected={normalized}
            onPick={(hex) => {
              onChange(hex)
              close()
            }}
          />
        </AnchoredPopover>
      )}
    </div>
  )
}
