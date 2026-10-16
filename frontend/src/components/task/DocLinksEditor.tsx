import { Plus, X } from '../../icons/phosphor'
import { docUrlHref } from '../../utils/docLinks'
import { OpenLinkButton } from './OpenLinkButton'

interface DocLinksEditorProps {
  urls: string[]
  onChange: (urls: string[]) => void
}

export function DocLinksEditor({ urls, onChange }: DocLinksEditorProps) {
  const rows = urls.length ? urls : ['']
  const lastIsEmpty = !rows[rows.length - 1].trim()
  const onlyEmptyRow = rows.length === 1 && !rows[0].trim()

  const update = (index: number, value: string) => onChange(rows.map((url, i) => (i === index ? value : url)))
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))

  return (
    <div className="space-y-1.5">
      {rows.map((url, index) => {
        const href = docUrlHref(url)
        return (
          <div key={index} className="flex items-center gap-1.5">
            <input
              value={url}
              onChange={(e) => update(index, e.target.value)}
              placeholder="Confluence, Notion, wiki page…"
              aria-label={`Documentation link ${index + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
            />
            {!onlyEmptyRow && (
              <>
                {href ? (
                  <OpenLinkButton href={href} label="Open documentation link" />
                ) : (
                  <span className="w-6 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label="Remove documentation link"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => onChange([...rows, ''])}
        disabled={lastIsEmpty}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-500/10"
      >
        <Plus className="h-3.5 w-3.5" /> Add link
      </button>
    </div>
  )
}
