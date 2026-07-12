import { getGeminiKey } from './aiKey'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const FALLBACK_MODEL = 'gemini-2.0-flash'
const MODEL_CACHE_KEY = 'monhub_gemini_model'

export class AiError extends Error {}

/**
 * Le nom exact des modèles Gemini disponibles change avec le temps (dépréciations, nouvelles
 * versions), et diffère parfois selon la clé/région. Plutôt que de parier sur un nom figé dans le
 * code, on demande à l'API la liste des modèles réellement utilisables par cette clé, et on
 * mémorise le premier modèle "flash" trouvé (rapide, gratuit) pour éviter de refaire l'appel à
 * chaque fois.
 */
async function resolveModel(key: string): Promise<string> {
  const cached = localStorage.getItem(MODEL_CACHE_KEY)
  if (cached) return cached
  try {
    const res = await fetch(`${API_BASE}/models?key=${encodeURIComponent(key)}`)
    if (!res.ok) return FALLBACK_MODEL
    const json = await res.json()
    const models: Array<{ name: string; supportedGenerationMethods?: string[] }> = json.models ?? []
    const candidates = models.filter(
      (m) => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('flash'),
    )
    const chosen = candidates.find((m) => m.name.includes('latest')) ?? candidates[0]
    const modelId = chosen ? chosen.name.replace(/^models\//, '') : FALLBACK_MODEL
    localStorage.setItem(MODEL_CACHE_KEY, modelId)
    return modelId
  } catch {
    return FALLBACK_MODEL
  }
}

/** Envoie un prompt à l'API Gemini (clé perso stockée en local) et renvoie le texte de la réponse. */
export async function askAi(prompt: string, system?: string): Promise<string> {
  const key = getGeminiKey()
  if (!key) {
    throw new AiError('Aucune clé IA configurée. Ajoute ta clé Gemini via le bouton « IA » en haut de l\'écran.')
  }

  const model = await resolveModel(key)

  let res: Response
  try {
    res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    })
  } catch {
    throw new AiError('Impossible de contacter l\'API Gemini (réseau indisponible ?).')
  }

  if (!res.ok) {
    let detail = ''
    try {
      const errJson = await res.json()
      detail = errJson?.error?.message ?? ''
    } catch {
      // corps d'erreur non-JSON, tant pis pour le détail
    }
    if (res.status === 404) {
      // Le modèle mémorisé a peut-être été déprécié depuis : on force une nouvelle résolution
      // la prochaine fois plutôt que de rester bloqué sur un nom qui ne marche plus.
      localStorage.removeItem(MODEL_CACHE_KEY)
    }
    if (res.status === 400 || res.status === 403) {
      throw new AiError(`Clé IA invalide ou refusée par Gemini.${detail ? ` (${detail})` : ''}`)
    }
    if (res.status === 429) {
      throw new AiError('Quota gratuit Gemini atteint pour le moment, réessaie plus tard.')
    }
    throw new AiError(`Erreur IA (${res.status})${detail ? ` : ${detail}` : ''}.`)
  }

  const json = await res.json()
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim()
  if (!text) throw new AiError('Réponse IA vide — la requête a peut-être été filtrée.')
  return text
}
