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
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg)] p-6 text-[var(--text)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h1 className="font-display text-lg font-semibold">
          Connexion à Mon<span className="text-[var(--gold)]">Hub</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Colle ton token GitHub personnel (fine-grained, limité au repo{' '}
          <code className="rounded bg-[var(--surface-2)] px-1 py-0.5">monhub-data</code>, permission
          Contents: Read and write).
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="github_pat_..."
          className="mt-4 w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--gold)]"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-[var(--red)]">{error}</p>}
        <button
          type="submit"
          disabled={!input.trim() || checking}
          className="font-display mt-4 w-full rounded-full bg-[var(--gold)] px-3 py-2.5 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {checking ? 'Vérification…' : 'Connexion'}
        </button>
      </form>
    </div>
  )
}
