const DEFAULT_EMOJI_SUGGESTIONS = [
  '🆕', '🚧', '🧪', '⏸️', '✅', '⏭️', '📋', '🔥', '⚡', '➖', '🧊', '🚦',
  '⭐', '🎯', '📌', '🐛', '💡', '🔧', '📦', '🚀', '⚠️', '👀', '💬', '📅',
]

interface EmojiSuggestionGridProps {
  value: string
  onSelect: (emoji: string) => void
  suggestions?: string[]
  disabled?: boolean
}

export function EmojiSuggestionGrid({
  value,
  onSelect,
  suggestions = DEFAULT_EMOJI_SUGGESTIONS,
  disabled,
}: EmojiSuggestionGridProps) {
  return (
    <div className="flex w-full flex-wrap gap-1">
      {suggestions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          disabled={disabled}
          className={`rounded-md px-1.5 py-1 text-base transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700 ${
            value === emoji ? 'bg-indigo-100 dark:bg-indigo-500/20' : ''
          }`}
          aria-label={`Use emoji ${emoji}`}
          aria-pressed={value === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
