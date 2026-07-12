export type Category = { name: string; color: string }

export type DocumentRef = {
  id: string
  name: string
  category?: string
  expirationDate?: string // 'YYYY-MM-DD'
  notes?: string
  done?: boolean // renouvelé/pris en charge — n'a de sens que si expirationDate est défini
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
