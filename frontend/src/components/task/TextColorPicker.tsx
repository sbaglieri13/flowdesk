import { ColorPicker } from '../common/ColorPicker'

interface TextColorPickerProps {
  onPick: (hex: string) => void
  onReset: () => void
  initialColor?: string | null
  className?: string
}

export function TextColorPicker({ onPick, onReset, initialColor, className = '' }: TextColorPickerProps) {
  return (
    <div
      className={`absolute top-full z-10 mt-1 w-60 ${className} rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-800`}
    >
      <ColorPicker
        initialColor={initialColor}
        onPick={onPick}
        onReset={onReset}
        resetLabel="Remove text color"
        swatchLabel={(hex) => `Set text color ${hex}`}
      />
    </div>
  )
}
