import { useCallback, useEffect, useState } from 'react'
import { cacheRead, fetchAndCache, isDirty, isFlushing, markDirty, onSyncStateChange } from './syncStore'

/**
 * Local-first data hook: reads instantly from the localStorage cache (works offline),
 * refreshes from GitHub in the background, and queues edits to be synced by the global
 * SyncManager (periodic flush + on app close) rather than writing on every call.
 */
export function useSyncedJson<T>(path: string, defaultValue: T) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(isFlushing())

  useEffect(() => {
    const unsubscribe = onSyncStateChange(() => {
      setSyncing(isFlushing())
      // Une résolution de conflit (garder/abandonner) touche directement le cache sans
      // passer par `save()` : on relit le cache dès que ce chemin n'est plus en attente.
      if (!isDirty(path)) {
        const cached = cacheRead<T>(path)
        if (cached) setData(cached.data)
      }
    })
    return unsubscribe
  }, [path])

  useEffect(() => {
    let cancelled = false
    const cached = cacheRead<T>(path)
    if (cached) {
      setData(cached.data)
      setLoading(false)
    }
    fetchAndCache(path, defaultValue)
      .then((remote) => {
        if (cancelled) return
        if (!isDirty(path)) setData(remote)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        if (!cached) setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const save = useCallback(
    async (next: T, message: string) => {
      setData(next)
      markDirty(path, next, message)
    },
    [path],
  )

  return { data, loading, error, saving: syncing, save }
}
