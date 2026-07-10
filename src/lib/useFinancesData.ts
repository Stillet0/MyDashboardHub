import { useCallback, useEffect, useState } from 'react'
import { getFile, putFile } from './githubStore'
import type { FinancesData } from './finances'

const PATH = 'data/finances.json'

export function useFinancesData() {
  const [data, setData] = useState<FinancesData | null>(null)
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return getFile<FinancesData>(PATH)
      .then((res) => {
        setData(res?.data ?? null)
        setSha(res?.sha)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (next: FinancesData, message: string) => {
      setSaving(true)
      setError(null)
      try {
        const res = await putFile(PATH, next, sha, message)
        setData(next)
        setSha(res.sha)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        throw e
      } finally {
        setSaving(false)
      }
    },
    [sha],
  )

  return { data, loading, error, saving, save, reload: load }
}
