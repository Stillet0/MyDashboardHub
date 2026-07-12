export type Appointment = {
  id: string
  title: string
  practitioner?: string
  date: string // 'YYYY-MM-DD'
  time?: string
  notes?: string
  done: boolean
}

export type Treatment = {
  id: string
  name: string
  dosage?: string
  ongoing: boolean
  renewalDate?: string // 'YYYY-MM-DD' — date de renouvellement de l'ordonnance
  notes?: string
}

export type HealthData = {
  appointments: Appointment[]
  treatments: Treatment[]
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isOverdue(a: Appointment): boolean {
  if (a.done) return false
  return a.date < toDateKey(new Date())
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date())
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

export function sortedAppointments(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return (a.time ?? '').localeCompare(b.time ?? '')
  })
}

export function renewalIsOverdue(t: Treatment): boolean {
  if (!t.renewalDate) return false
  return t.renewalDate < toDateKey(new Date())
}

export function renewalIsSoon(t: Treatment, withinDays = 14): boolean {
  if (!t.renewalDate || renewalIsOverdue(t)) return false
  return daysUntil(t.renewalDate) <= withinDays
}

export function sortedTreatments(treatments: Treatment[]): Treatment[] {
  return [...treatments].sort((a, b) => {
    if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1
    const aDate = a.renewalDate ?? '9999-99-99'
    const bDate = b.renewalDate ?? '9999-99-99'
    return aDate.localeCompare(bDate)
  })
}
