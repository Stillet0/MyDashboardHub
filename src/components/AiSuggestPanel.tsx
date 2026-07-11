import { useState } from 'react'
import { useAi } from '../lib/useAi'
import { parseListItems } from '../lib/aiText'

type Props = {
  label: string
  system?: string
  prompt: string
  /** 'list' parse la réponse en éléments cochables avec un bouton d'application ; 'text' affiche juste le texte. */
  mode?: 'list' | 'text'
  applyLabel?: string
  onApply?: (items: string[]) => void
}

export default function AiSuggestPanel({ label, system, prompt, mode = 'list', applyLabel = 'Ajouter', onApply }: Props) {
  const { ask, loading, error, hasKey } = useAi()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [items, setItems] = useState<string[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  async function run() {
    setOpen(true)
    setResult(null)
    setItems([])
    const text = await ask(prompt, system)
    if (text) {
      setResult(text)
      if (mode === 'list') {
        const parsed = parseListItems(text)
        setItems(parsed)
        setChecked(Object.fromEntries(parsed.map((_, i) => [i, true])))
      }
    }
  }

  function handleApply() {
    const selected = items.filter((_, i) => checked[i])
    onApply?.(selected)
    setOpen(false)
    setResult(null)
  }

  if (!hasKey) return null

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="font-display rounded-full border border-[var(--gold)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--gold)] transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {loading ? 'Réflexion…' : `✨ ${label}`}
      </button>

      {open && (
        <div className="mt-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
          {error && <p className="text-[var(--red)]">{error}</p>}
          {!error && !result && <p className="text-[var(--text-muted)]">Réflexion en cours…</p>}
          {result && mode === 'text' && (
            <p className="whitespace-pre-wrap text-[var(--text)]">{result}</p>
          )}
          {result && mode === 'list' && items.length === 0 && (
            <p className="whitespace-pre-wrap text-[var(--text)]">{result}</p>
          )}
          {result && mode === 'list' && items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((it, i) => (
                <label key={i} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                    className="mt-1"
                  />
                  <span>{it}</span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-2.5 flex gap-2">
            {result && mode === 'list' && items.length > 0 && (
              <button
                onClick={handleApply}
                className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408]"
              >
                {applyLabel}
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
