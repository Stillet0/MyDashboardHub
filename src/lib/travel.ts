import type { ChecklistItem } from './checklist'

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

export function fmtDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
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
