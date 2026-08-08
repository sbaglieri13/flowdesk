const NAME_EMOJI: [RegExp, string][] = [
  [/new|backlog|todo/i, '🆕'],
  [/progress|doing|active/i, '🚧'],
  [/test|review|qa/i, '🧪'],
  [/hold|block|paus/i, '⏸️'],
  [/done|complete|finish/i, '✅'],
  [/skip|cancel|reject/i, '⏭️'],
]

export function guessColumnEmoji(name: string): string {
  const match = NAME_EMOJI.find(([pattern]) => pattern.test(name))
  return match ? match[1] : '📋'
}

const ACCENTS = [
  'border-t-indigo-400 dark:border-t-indigo-500',
  'border-t-emerald-400 dark:border-t-emerald-500',
  'border-t-amber-400 dark:border-t-amber-500',
  'border-t-sky-400 dark:border-t-sky-500',
  'border-t-violet-400 dark:border-t-violet-500',
  'border-t-rose-400 dark:border-t-rose-500',
]

export function columnAccentClass(position: number): string {
  return ACCENTS[position % ACCENTS.length]
}
