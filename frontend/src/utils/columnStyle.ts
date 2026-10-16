const NAME_ICONS: [RegExp, string][] = [
  [/new|backlog|todo|inbox/i, 'tray'],
  [/analy|research|investigat/i, 'magnifying-glass'],
  [/progress|doing|active|wip/i, 'barricade'],
  [/test|qa/i, 'flask'],
  [/review/i, 'eye'],
  [/deploy|release|ship/i, 'package'],
  [/hold|block|paus|wait/i, 'pause-circle'],
  [/done|complete|finish/i, 'check-circle'],
  [/skip|cancel|reject/i, 'skip-forward'],
]

export function guessColumnIcon(name: string): string {
  const match = NAME_ICONS.find(([pattern]) => pattern.test(name))
  return match ? match[1] : 'kanban'
}

const ACCENTS: [string, string][] = [
  ['border-t-indigo-400 dark:border-t-indigo-500', '#a855f7'],
  ['border-t-emerald-400 dark:border-t-emerald-500', '#10b981'],
  ['border-t-amber-400 dark:border-t-amber-500', '#f59e0b'],
  ['border-t-sky-400 dark:border-t-sky-500', '#0ea5e9'],
  ['border-t-violet-400 dark:border-t-violet-500', '#8b5cf6'],
  ['border-t-rose-400 dark:border-t-rose-500', '#f43f5e'],
]

export function columnAccentClass(position: number): string {
  return ACCENTS[position % ACCENTS.length][0]
}

export function columnAccentColor(position: number): string {
  return ACCENTS[position % ACCENTS.length][1]
}
