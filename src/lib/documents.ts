export type Category = { name: string; color: string }

export type DocumentRef = {
  id: string
  name: string
  category?: string
  expirationDate?: string // 'YYYY-MM-DD'
  notes?: string
}

export type DocumentsData = {
  documents: DocumentRef[]
  categories: Category[]
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isExpired(doc: DocumentRef): boolean {
  if (!doc.expirationDate) return false
  return doc.expirationDate < toDateKey(new Date())
}

export function isExpiringSoon(doc: DocumentRef, withinDays = 30): boolean {
  if (!doc.expirationDate || isExpired(doc)) return false
  const [y, m, d] = doc.expirationDate.split('-').map(Number)
  const exp = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  return days <= withinDays
}

export function daysUntil(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export function fmtDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
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
