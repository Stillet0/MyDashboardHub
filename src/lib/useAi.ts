import { useState } from 'react'
import { askAi, AiError } from './gemini'
import { hasGeminiKey } from './aiKey'

export function useAi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(prompt: string, system?: string): Promise<string | null> {
    setLoading(true)
    setError(null)
    try {
      return await askAi(prompt, system)
    } catch (e) {
      setError(e instanceof AiError ? e.message : "Erreur IA inattendue.")
      return null
    } finally {
      setLoading(false)
    }
  }

  return { ask, loading, error, hasKey: hasGeminiKey() }
}
