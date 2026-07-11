import { getGeminiKey } from './aiKey'

const MODEL = 'gemini-2.5-flash'

export class AiError extends Error {}

/** Envoie un prompt à l'API Gemini (clé perso stockée en local) et renvoie le texte de la réponse. */
export async function askAi(prompt: string, system?: string): Promise<string> {
  const key = getGeminiKey()
  if (!key) {
    throw new AiError('Aucune clé IA configurée. Ajoute ta clé Gemini via le bouton « IA » en haut de l\'écran.')
  }

  let res: Response
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      },
    )
  } catch {
    throw new AiError('Impossible de contacter l\'API Gemini (réseau indisponible ?).')
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      throw new AiError('Clé IA invalide ou refusée par Gemini.')
    }
    if (res.status === 429) {
      throw new AiError('Quota gratuit Gemini atteint pour le moment, réessaie plus tard.')
    }
    throw new AiError(`Erreur IA (${res.status}).`)
  }

  const json = await res.json()
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim()
  if (!text) throw new AiError('Réponse IA vide — la requête a peut-être été filtrée.')
  return text
}
