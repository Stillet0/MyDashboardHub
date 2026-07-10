import { useState, type FormEvent, type ReactNode } from 'react'
import { checkToken, getToken, setToken } from '../lib/githubStore'

export default function TokenGate({ children }: { children: ReactNode }) {
  const [token, setLocalToken] = useState(() => getToken())
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  if (token) return <>{children}</>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setChecking(true)
    try {
      const ok = await checkToken(input.trim())
      if (!ok) {
        setError('Token invalide ou sans accès au repo monhub-data.')
        return
      }
      setToken(input.trim())
      setLocalToken(input.trim())
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Connexion à MonHub
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Colle ton token GitHub personnel (fine-grained, limité au repo{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">
            monhub-data
          </code>
          , permission Contents: Read and write).
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="github_pat_..."
          className="mt-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!input.trim() || checking}
          className="mt-4 w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {checking ? 'Vérification…' : 'Connexion'}
        </button>
      </form>
    </div>
  )
}
