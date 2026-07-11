import { useCallback, useEffect, useState } from 'react'
import { getFile, putFile } from './githubStore'
import type { DocumentsData } from './documents'

const PATH = 'data/documents.json'

export function useDocumentsData() {
  const [data, setData] = useState<DocumentsData | null>(null)
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return getFile<DocumentsData>(PATH)
      .then((res) => {
        setData(res?.data ?? { documents: [], categories: [] })
        setSha(res?.sha)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (next: DocumentsData, message: string) => {
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
