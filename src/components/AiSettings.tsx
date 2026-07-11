import { useState } from 'react'
import { clearGeminiKey, hasGeminiKey, setGeminiKey } from '../lib/aiKey'

export default function AiSettings() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hasKey, setHasKey] = useState(hasGeminiKey())

  function handleSave() {
    if (!input.trim()) return
    setGeminiKey(input.trim())
    setHasKey(true)
    setInput('')
    setOpen(false)
  }

  function handleClear() {
    clearGeminiKey()
    setHasKey(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs ${hasKey ? 'text-[var(--text-faint)] hover:text-[var(--text)]' : 'text-[var(--gold)] hover:underline'}`}
      >
        {hasKey ? '✨ IA' : '✨ Activer l\'IA'}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-2 w-72 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-lg">
          <p className="text-xs text-[var(--text-muted)]">
            MonHub utilise l'API gratuite Google Gemini pour les fonctionnalités intelligentes (planification,
            décomposition de tâches, suggestions de voyage…). Ta clé reste sur cet appareil.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs text-[var(--gold)] hover:underline"
          >
            Obtenir une clé gratuite sur Google AI Studio →
          </a>

          {hasKey ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--emerald)]">✓ Clé IA configurée</span>
              <button
                onClick={handleClear}
                className="font-display rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:text-[var(--red)]"
              >
                Retirer
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Colle ta clé API Gemini"
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-xs outline-none focus:border-[var(--gold)]"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={!input.trim()}
                className="font-display mt-2 w-full rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          )}

          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full text-center text-[11px] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}
