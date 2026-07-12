import { askAi } from './gemini'

export type QuickAddResult =
  | { module: 'Tâches'; title: string; category?: string; priority?: 'haute' | 'normale' | 'basse'; dueDate?: string }
  | { module: 'Agenda'; title: string; date: string; time?: string; location?: string }
  | { module: 'Santé'; title: string; date: string; time?: string; practitioner?: string }
  | { module: 'Objectifs'; title: string; description?: string; targetDate?: string }
  | { module: 'Documents'; name: string; category?: string; expirationDate?: string }

const MODULES = ['Tâches', 'Agenda', 'Santé', 'Objectifs', 'Documents'] as const

function todayKey(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const SYSTEM_PROMPT = `Tu classes une phrase en français dans l'un de ces modules et en extrais des champs structurés, en JSON strict, sans aucun texte autour (pas de \`\`\`, pas d'explication).

Modules possibles et leurs champs exacts :
- Tâches : {"module":"Tâches","title":string,"category"?:string,"priority"?:"haute"|"normale"|"basse","dueDate"?:"YYYY-MM-DD"}
- Agenda : {"module":"Agenda","title":string,"date":"YYYY-MM-DD","time"?:"HH:MM","location"?:string}
- Santé (rendez-vous médical) : {"module":"Santé","title":string,"date":"YYYY-MM-DD","time"?:"HH:MM","practitioner"?:string}
- Objectifs (objectif long terme) : {"module":"Objectifs","title":string,"description"?:string,"targetDate"?:"YYYY-MM-DD"}
- Documents (référence à renouveler/suivre) : {"module":"Documents","name":string,"category"?:string,"expirationDate"?:"YYYY-MM-DD"}

Choisis le module le plus probable. Résous les dates relatives ("demain", "vendredi", "dans 2 mois") par rapport à aujourd'hui : ${todayKey()}. N'invente aucun champ optionnel si l'information n'est pas donnée dans la phrase. Réponds uniquement avec l'objet JSON.`

export class QuickAddError extends Error {}

const DATE_FIELDS = ['dueDate', 'date', 'targetDate', 'expirationDate'] as const
const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * L'IA ne respecte pas toujours à la lettre le format "YYYY-MM-DD" demandé dans le prompt.
 * Une date mal formée (ex: horodatage ISO complet) ferait planter l'affichage plus tard
 * (Intl.DateTimeFormat sur une Invalid Date) : on l'ignore ici plutôt que de la stocker,
 * comme si le champ optionnel n'avait pas été fourni.
 */
function sanitizeDateFields(parsed: Record<string, unknown>): Record<string, unknown> {
  const out = { ...parsed }
  for (const field of DATE_FIELDS) {
    const value = out[field]
    if (value !== undefined && (typeof value !== 'string' || !STRICT_DATE.test(value))) {
      delete out[field]
    }
  }
  return out
}

export async function parseQuickAdd(text: string): Promise<QuickAddResult> {
  const raw = await askAi(text, SYSTEM_PROMPT)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new QuickAddError("Je n'ai pas compris, essaie de reformuler.")
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new QuickAddError("Je n'ai pas compris, essaie de reformuler.")
  }
  if (typeof parsed.module !== 'string' || !(MODULES as readonly string[]).includes(parsed.module)) {
    throw new QuickAddError("Je n'ai pas identifié à quel module ça correspond.")
  }
  if (parsed.module !== 'Documents' && typeof parsed.title !== 'string') {
    throw new QuickAddError("Je n'ai pas réussi à extraire un titre clair.")
  }
  if (parsed.module === 'Documents' && typeof parsed.name !== 'string') {
    throw new QuickAddError("Je n'ai pas réussi à extraire un nom clair.")
  }
  parsed = sanitizeDateFields(parsed)
  if ((parsed.module === 'Agenda' || parsed.module === 'Santé') && typeof parsed.date !== 'string') {
    throw new QuickAddError("Je n'ai pas réussi à extraire une date valide.")
  }
  return parsed as QuickAddResult
}
