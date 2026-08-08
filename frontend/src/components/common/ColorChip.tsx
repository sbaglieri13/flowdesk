interface ColorChipProps {
  name: string
  color: string
  emoji?: string | null
  placeholder?: string
}

/** Live preview of a tag/priority pill, matching how it renders on task cards. */
export function ColorChip({ name, color, emoji, placeholder = 'Preview' }: ColorChipProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {emoji ? `${emoji} ` : ''}
      {name.trim() || placeholder}
    </span>
  )
}
