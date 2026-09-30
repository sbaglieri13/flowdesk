import { useState } from 'react'
import { ApiError } from '../api/client'

export function useAsyncAction(genericErrorMessage: string) {
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage)
    }
  }

  return { error, setError, run }
}
