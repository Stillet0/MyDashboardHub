import type { ChecklistItem } from './checklist'
import type { DocumentRef } from './documents'

export type Trip = {
  id: string
  name: string
  destination?: string
  startDate?: string // 'YYYY-MM-DD'
  endDate?: string // 'YYYY-MM-DD'
  budget?: number
  checklist?: ChecklistItem[]
}

export type Expense = {
  id: string
  tripId: string
  label: string
  amount: number
  date?: string
}

export type TravelData = {
  trips: Trip[]
  expenses: Expense[]
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isPast(trip: Trip): boolean {
  const ref = trip.endDate ?? trip.startDate
  if (!ref) return false
  return ref < toDateKey(new Date())
}

export function sortedTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aDate = a.startDate ?? '9999-99-99'
    const bDate = b.startDate ?? '9999-99-99'
    return aDate.localeCompare(bDate)
  })
}

export function expensesForTrip(data: TravelData, tripId: string): Expense[] {
  return [...data.expenses.filter((e) => e.tripId === tripId)].sort((a, b) =>
    (a.date ?? '').localeCompare(b.date ?? ''),
  )
}

export function totalSpent(data: TravelData, tripId: string): number {
  return expensesForTrip(data, tripId).reduce((s, e) => s + e.amount, 0)
}

// Un champ date mal formé ne doit jamais faire planter tout l'écran : on retombe sur une
// valeur neutre plutôt que de laisser `Intl.DateTimeFormat` lever une exception non rattrapée.
export function fmtDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey)
  if (!match) return dateKey
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function fmtDateRange(start?: string, end?: string): string {
  if (!start && !end) return ''
  if (start && end) return `${fmtDate(start)} → ${fmtDate(end)}`
  return fmtDate(start ?? end!)
}

export function fmtEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' €'
}

const TRAVEL_DOC_KEYWORDS = ['passeport', "carte d'identité", 'carte identite', 'cni', 'visa']

function isTravelDocument(name: string): boolean {
  const n = name.trim().toLowerCase()
  return TRAVEL_DOC_KEYWORDS.some((k) => n.includes(k))
}

export type TripDocumentConflict = { trip: Trip; doc: DocumentRef }

/**
 * Repère les voyages à venir pour lesquels un document d'identité (passeport, carte d'identité,
 * visa) sera déjà expiré — un rapprochement que rien d'autre ne fait puisque Documents et
 * Voyages sont deux modules indépendants qui ne se consultent pas l'un l'autre.
 */
export function tripDocumentConflicts(travel: TravelData, documents: DocumentRef[]): TripDocumentConflict[] {
  const upcomingTrips = travel.trips.filter((t) => !isPast(t) && t.startDate)
  const travelDocs = documents.filter((d) => isTravelDocument(d.name) && d.expirationDate && !d.done)
  const out: TripDocumentConflict[] = []
  upcomingTrips.forEach((trip) => {
    const tripEnd = trip.endDate ?? trip.startDate!
    travelDocs.forEach((doc) => {
      if (doc.expirationDate! <= tripEnd) out.push({ trip, doc })
    })
  })
  return out
}
