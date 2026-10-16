import { ArrowCounterClockwise, ArrowLeft, CheckCircle, Database, DownloadSimple, Link, Warning } from '../icons/phosphor'
import { useCallback, useEffect, useState } from 'react'
import { backupApi } from '../api/backup'
import { settingsApi } from '../api/settings'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useBoardData } from '../state/useBoardData'
import type { BackupInfo } from '../types'
import { formatFileSize } from '../utils/fileSize'

const GENERIC_ERROR = 'Something went wrong. Please try again.'

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
    <div className="nice-scrollbar h-full overflow-y-auto bg-gradient-to-br from-indigo-100/70 via-slate-100 to-slate-200/70 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to board
        </Button>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Link className="h-4 w-4 text-indigo-500" /> External reference link
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
            <Database className="h-4 w-4 text-indigo-500" /> Backups
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Export a timestamped JSON copy of all board data to your Supabase storage, or restore a previous one.
            Restoring overwrites all current data. Attachment files are kept in Supabase Storage and are not part of
            the backup.
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
                      {new Date(backup.created_at).toLocaleString()} · {formatFileSize(backup.size_bytes)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={backupApi.downloadUrl(backup.filename)}>
                        <DownloadSimple className="h-3.5 w-3.5" /> Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      onClick={() => setRestoringFile(backup.filename)}
                    >
                      <ArrowCounterClockwise className="h-3.5 w-3.5" /> Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {message && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" /> {message}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Warning className="h-4 w-4 shrink-0" /> {error}
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
