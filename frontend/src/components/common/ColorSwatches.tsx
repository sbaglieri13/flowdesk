import { TAG_SWATCHES } from '../../utils/tagColors'

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

export function ColorSwatches({ value, onChange, disabled }: ColorSwatchesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          disabled={disabled}
          className={`h-5 w-5 shrink-0 rounded-full transition disabled:opacity-50 ${
            value === swatch ? 'ring-2 ring-slate-400 ring-offset-1 dark:ring-offset-slate-800' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: swatch }}
          aria-label={`Choose color ${swatch}`}
          aria-pressed={value === swatch}
        />
      ))}
    </div>
  )
}
