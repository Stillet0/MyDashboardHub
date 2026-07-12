import { useEffect, useState } from 'react'
import { flushDirty, getLastSyncError, hasPendingChanges, isFlushing, onSyncStateChange } from './syncStore'

const FIVE_MINUTES = 5 * 60 * 1000

/**
 * Drives the app's autosave: local edits are queued (see syncStore.markDirty) and pushed
 * to GitHub every 5 minutes, and again whenever the app is backgrounded/closed (mobile
 * "close", switching tabs, laptop lid) via visibilitychange/pagehide - not just beforeunload,
 * which mobile browsers don't reliably fire.
 */
export function useSyncManager() {
  const [pending, setPending] = useState(hasPendingChanges())
  const [syncing, setSyncing] = useState(isFlushing())
  const [error, setError] = useState(getLastSyncError())

  useEffect(() => {
    const unsubscribe = onSyncStateChange(() => {
      setPending(hasPendingChanges())
      setSyncing(isFlushing())
      setError(getLastSyncError())
    })

    // Des modifications non synchronisées peuvent avoir survécu à une fermeture brutale
    // (crash, coupure réseau) de la session précédente : on tente de les pousser tout de
    // suite plutôt que d'attendre jusqu'à 5 minutes.
    if (hasPendingChanges()) flushDirty()

    const interval = setInterval(() => {
      flushDirty()
    }, FIVE_MINUTES)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushDirty(true)
    }
    const onPageHide = () => {
      flushDirty(true)
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return { pending, syncing, error, syncNow: () => flushDirty() }
}
