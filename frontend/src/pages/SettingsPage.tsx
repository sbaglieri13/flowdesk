import { AlertTriangle, ArrowLeft, CheckCircle2, Database, Download, Link2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { backupApi } from '../api/backup'
import { settingsApi } from '../api/settings'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useBoardData } from '../state/BoardContext'
import type { BackupInfo } from '../types'

const GENERIC_ERROR = 'Something went wrong. Please try again.'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, refreshSettings } = useBoardData()
  const [baseUrl, setBaseUrl] = useState(settings.external_reference_base_url)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [restoringFile, setRestoringFile] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { error, setError, run: runOrReportError } = useAsyncAction(GENERIC_ERROR)

  useEffect(() => setBaseUrl(settings.external_reference_base_url), [settings.external_reference_base_url])

  const loadBackups = useCallback(
    () => backupApi.list().then(setBackups).catch(() => setError('Could not load backups.')),
    [setError],
  )
  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleSaveBaseUrl = () =>
    runOrReportError(async () => {
      await settingsApi.update({ external_reference_base_url: baseUrl })
      await refreshSettings()
      setMessage('Settings saved.')
      setTimeout(() => setMessage(null), 2000)
    })

  const handleExport = () =>
    runOrReportError(async () => {
      await backupApi.export()
      await loadBackups()
      setMessage('Backup exported.')
      setTimeout(() => setMessage(null), 2000)
    })

  const confirmRestore = () =>
    runOrReportError(async () => {
      if (!restoringFile) return
      await backupApi.restore(restoringFile)
      setRestoringFile(null)
      setMessage('Backup restored. Reload the page to see the restored data.')
    })

  return (
    <div className="nice-scrollbar h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to board
        </Button>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Link2 className="h-4 w-4 text-indigo-500" strokeWidth={2} /> External reference link
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            If set, a task's external reference (e.g. a Jira key) is rendered as a clickable link using this base URL.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net/browse"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
            />
            <Button onClick={handleSaveBaseUrl}>Save</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Database className="h-4 w-4 text-indigo-500" strokeWidth={2} /> Backups
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Export a timestamped copy of the database, or restore a previous one. Restoring overwrites all current data.
          </p>
          <Button variant="outline" onClick={handleExport} className="mb-3">
            Export backup now
          </Button>

          {backups.length === 0 ? (
            <p className="text-sm text-slate-400">No backups yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {backups.map((backup) => (
                <li key={backup.filename} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{backup.filename}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(backup.created_at).toLocaleString()} · {formatSize(backup.size_bytes)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={backupApi.downloadUrl(backup.filename)}>
                        <Download className="h-3.5 w-3.5" strokeWidth={2} /> Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      onClick={() => setRestoringFile(backup.filename)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} /> Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {message && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} /> {message}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} /> {error}
          </p>
        )}
      </div>

      {restoringFile && (
        <ConfirmDialog
          title="Restore this backup?"
          message={`This replaces all current data with the contents of "${restoringFile}". This cannot be undone.`}
          confirmLabel="Restore"
          destructive
          onConfirm={confirmRestore}
          onCancel={() => setRestoringFile(null)}
        />
      )}
    </div>
  )
}
