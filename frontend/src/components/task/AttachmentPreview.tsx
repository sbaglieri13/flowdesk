import { DownloadSimple, Warning, X } from '../../icons/phosphor'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { Attachment } from '../../types'
import { Button } from '../ui/button'

interface AttachmentPreviewProps {
  filename: string
  kind: NonNullable<Attachment['preview_kind']>
  previewUrl: string
  downloadUrl: string
  onClose: () => void
}

const MAX_TEXT_CHARS = 200_000

type TextState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; text: string; truncated: boolean }

function TextPreview({ url }: { url: string }) {
  const [state, setState] = useState<TextState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText)
        return response.text()
      })
      .then((text) => {
        if (!cancelled)
          setState({ status: 'ready', text: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (state.status === 'loading') return <p className="p-6 text-sm text-slate-500">Loading preview…</p>
  if (state.status === 'error')
    return (
      <p role="alert" className="flex items-center gap-1.5 p-6 text-sm text-red-600 dark:text-red-300">
        <Warning className="h-4 w-4" /> Could not load the preview. You can still download the file.
      </p>
    )
  return (
    <div className="nice-scrollbar h-full overflow-auto">
      {state.truncated && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Showing the first part of a large file — download it to see everything.
        </p>
      )}
      <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        {state.text}
      </pre>
    </div>
  )
}

export function AttachmentPreview({ filename, kind, previewUrl, downloadUrl, onClose }: AttachmentPreviewProps) {
  useEscapeKey(onClose)

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${filename}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft-lg ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{filename}</h2>
          <a
            href={downloadUrl}
            download={filename}
            className="flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            <DownloadSimple className="h-3.5 w-3.5" aria-hidden="true" /> Download
          </a>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950">
          {kind === 'image' && (
            <div className="flex h-full items-center justify-center p-4">
              <img src={previewUrl} alt={filename} className="max-h-full max-w-full rounded-lg object-contain shadow-soft" />
            </div>
          )}
          {kind === 'pdf' && <iframe src={previewUrl} title={filename} className="h-full w-full border-0" />}
          {kind === 'text' && <TextPreview url={previewUrl} />}
        </div>
      </div>
    </div>,
    document.body,
  )
}
