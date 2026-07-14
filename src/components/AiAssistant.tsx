import { useState } from 'react'
import { useAi } from '../lib/useAi'

type Props = { digest: string }

const BASE_SYSTEM =
  "Tu es l'assistant personnel de l'utilisateur pour son dashboard MonHub. Réponds à sa question UNIQUEMENT à partir des données ci-dessous (ne suppose rien d'autre, n'invente jamais une donnée absente). Si l'information demandée n'y figure pas, dis-le clairement plutôt que de deviner. Réponds en français, de façon concise et directe (quelques phrases, ou une courte liste si plus adapté)."

export default function AiAssistant({ digest }: Props) {
  const { ask, loading, error, hasKey } = useAi()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)

  if (!hasKey) return null

  async function handleAsk() {
    if (!question.trim()) return
    setAnswer(null)
    const text = await ask(question, `${BASE_SYSTEM}\n\nDONNÉES DE L'UTILISATEUR :\n${digest}`)
    if (text) setAnswer(text)
  }

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-2 text-sm font-medium text-[var(--text-muted)]">✨ Demande-moi n'importe quoi sur tes données</div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Combien j'ai dépensé en voiture ce trimestre ?"
          className="flex-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="font-display shrink-0 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
        >
          {loading ? 'Réflexion…' : 'Demander'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--red)]">{error}</p>}
      {answer && <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text)]">{answer}</p>}
    </div>
  )
}
