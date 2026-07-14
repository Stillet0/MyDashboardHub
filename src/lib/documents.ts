export type Category = { name: string; color: string }

export type DocumentRef = {
  id: string
  name: string
  category?: string
  expirationDate?: string // 'YYYY-MM-DD'
  notes?: string
  done?: boolean // renouvelé/pris en charge — n'a de sens que si expirationDate est défini
  renewalMonths?: number // ex: renouvelé tous les 12 mois — reprogrammé automatiquement une fois fait
}

export const RENEWAL_PRESETS = [
  { label: 'Tous les ans', months: 12 },
  { label: 'Tous les 2 ans', months: 24 },
  { label: 'Tous les 5 ans', months: 60 },
  { label: 'Tous les 10 ans', months: 120 },
]

/** Intervalle de renouvellement typique suggéré selon le nom du document (l'utilisateur reste libre de l'ajuster). */
export function suggestRenewalMonths(name: string): number | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  if (n.includes('enfant') && (n.includes('passeport') || n.includes('identité') || n.includes('identite'))) return 60
  if (n.includes('passeport') || n.includes("carte d'identité") || n.includes('carte identite') || n.includes('cni'))
    return 120
  if (n.includes('permis de conduire') || n.includes('permis conduire')) return 180
  if (n.includes('assurance') || n.includes('mutuelle')) return 12
  if (n.includes('contrôle technique') || n.includes('controle technique')) return 24
  return undefined
}

export function isDocumentDone(doc: DocumentRef): boolean {
  return doc.done === true
}

export type DocumentsData = {
  documents: DocumentRef[]
  categories: Category[]
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isExpired(doc: DocumentRef): boolean {
  if (!doc.expirationDate || doc.done) return false
  return doc.expirationDate < toDateKey(new Date())
}

export function isExpiringSoon(doc: DocumentRef, withinDays = 30): boolean {
  if (!doc.expirationDate || doc.done || isExpired(doc)) return false
  const exp = parseDateKey(doc.expirationDate)
  if (!exp) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  return days <= withinDays
}

// Un champ date mal formé (ex: renvoyé par l'IA de l'Ajout rapide sans respecter strictement
// "YYYY-MM-DD") ne doit jamais faire planter tout l'écran : on retombe sur une valeur neutre
// plutôt que de laisser `Intl.DateTimeFormat` lever une exception non rattrapée.
function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function daysUntil(dateKey: string): number {
  const due = parseDateKey(dateKey)
  if (!due) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export function fmtDate(dateKey: string): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function categoryColor(data: DocumentsData, name: string | undefined): string {
  if (!name) return '#8B93A1'
  return data.categories.find((c) => c.name === name)?.color ?? '#8B93A1'
}

export function sortedDocuments(documents: DocumentRef[]): DocumentRef[] {
  return [...documents].sort((a, b) => {
    const aExp = a.expirationDate ?? '9999-99-99'
    const bExp = b.expirationDate ?? '9999-99-99'
    if (aExp !== bExp) return aExp.localeCompare(bExp)
    return a.name.localeCompare(b.name)
  })
}

/** Calcule la prochaine date d'expiration d'un document à renouvellement automatique une fois renouvelé. */
export function nextExpirationDate(doc: DocumentRef): string | undefined {
  if (!doc.renewalMonths) return undefined
  const base = parseDateKey(doc.expirationDate ?? toDateKey(new Date())) ?? new Date()
  base.setMonth(base.getMonth() + doc.renewalMonths)
  return toDateKey(base)
}

export function describeRenewal(doc: DocumentRef): string | null {
  if (!doc.renewalMonths) return null
  const preset = RENEWAL_PRESETS.find((p) => p.months === doc.renewalMonths)
  return '🔁 ' + (preset ? preset.label.toLowerCase() : `tous les ${doc.renewalMonths} mois`)
}
