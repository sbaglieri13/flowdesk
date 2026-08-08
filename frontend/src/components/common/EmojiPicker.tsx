import { EmojiSuggestionGrid } from './EmojiSuggestionGrid'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  suggestions?: string[]
  disabled?: boolean
}

export function EmojiPicker({ value, onChange, suggestions, disabled }: EmojiPickerProps) {
  return (
    <div className="w-full space-y-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={8}
        placeholder="🙂"
        disabled={disabled}
        aria-label="Emoji (type, or paste one copied from anywhere)"
        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-lg disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
      />
      <EmojiSuggestionGrid value={value} onSelect={onChange} suggestions={suggestions} disabled={disabled} />
    </div>
  )
}
