import { ArrowSquareOut } from '../../icons/phosphor'

interface OpenLinkButtonProps {
  href: string
  label: string
}

export function OpenLinkButton({ href, label }: OpenLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
      aria-label={label}
      title={href}
    >
      <ArrowSquareOut className="h-4 w-4" />
    </a>
  )
}
