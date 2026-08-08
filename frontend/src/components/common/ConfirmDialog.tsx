import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Button } from '../ui/button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEscapeKey(onCancel)

  useEffect(() => {
    // Focus the non-destructive action by default, so hitting Enter out of
    // habit after a keyboard-driven flow doesn't accidentally confirm delete.
    cancelButtonRef.current?.focus()
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-soft-lg ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10"
        >
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
              </span>
            )}
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button ref={cancelButtonRef} variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'default' : 'gradient'}
              onClick={onConfirm}
              className={destructive ? 'bg-red-600 shadow-none hover:bg-red-700' : ''}
            >
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
