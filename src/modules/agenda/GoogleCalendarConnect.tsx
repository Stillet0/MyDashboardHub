import { useState } from 'react'
import {
  clearGoogleConnection,
  getClientId,
  isConnected,
  requestAccessToken,
  setClientId,
} from '../../lib/googleCalendar'

export default function GoogleCalendarConnect({ onConnected }: { onConnected: () => void }) {
  const [connected, setConnected] = useState(isConnected())
  const [input, setInput] = useState(getClientId() ?? '')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(!connected)

  async function handleConnect() {
    setError(null)
    if (!input.trim()) {
      setError('Colle ton Client ID Google OAuth.')
      return
    }
    setConnecting(true)
    try {
      setClientId(input)
      await requestAccessToken()
      setConnected(true)
      setShowSetup(false)
      onConnected()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect() {
    clearGoogleConnection()
    setConnected(false)
    setShowSetup(true)
    setInput('')
  }

  if (connected && !showSetup) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <span className="text-sm text-[var(--text-muted)]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--emerald)]" />
          Google Calendar connecté
        </span>
        <button
          onClick={handleDisconnect}
          className="text-xs text-[var(--text-faint)] hover:text-[var(--red)]"
        >
          Déconnecter
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-2 text-sm font-medium text-[var(--text-muted)]">Connecter Google Calendar</div>
      <p className="mb-3 text-xs text-[var(--text-faint)]">
        Colle ton{' '}
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--gold)] underline"
        >
          OAuth Client ID
        </a>{' '}
        (type "Application Web", origine autorisée : ce domaine). Lecture seule, rien n'est jamais écrit
        dans ton calendrier.
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="xxxxx.apps.googleusercontent.com"
          className="flex-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
        >
          {connecting ? 'Connexion…' : 'Connecter'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--red)]">{error}</p>}
    </div>
  )
}
