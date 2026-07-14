export type Vehicle = { id: string; name: string; currentMileage: number }

export type Deadline = {
  id: string
  vehicleId: string
  label: string
  dueDate?: string // 'YYYY-MM-DD' — au moins l'un des deux (dueDate / dueMileage) doit être renseigné
  dueMileage?: number // ex: vidange due à 65 000 km
  notes?: string
  done?: boolean // absent = pas fait (comportement historique, avant l'ajout de ce champ)
  recurrenceMonths?: number // ex: vidange tous les 12 mois — reprogrammée automatiquement une fois faite
  recurrenceKm?: number // ex: vidange tous les 10 000 km — reprogrammée automatiquement une fois faite
}

export type MaintenanceEntry = {
  id: string
  vehicleId: string
  date: string // 'YYYY-MM-DD'
  label: string
  mileage?: number
  cost?: number
  notes?: string
  done?: boolean // absent = done (entretien historique enregistré avant l'ajout de ce champ)
}

export type CarData = {
  vehicles: Vehicle[]
  deadlines: Deadline[]
  maintenanceLog: MaintenanceEntry[]
}

export const DEADLINE_PRESETS = ['Contrôle technique', 'Vidange', 'Assurance', 'Autre']

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isOverdue(dueDate: string): boolean {
  return dueDate < toDateKey(new Date())
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

export function daysUntil(dueDate: string): number {
  const due = parseDateKey(dueDate)
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

export function fmtKm(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' km'
}

export function fmtEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' €'
}

/** Kilomètres restants avant l'échéance (négatif si dépassée), ou `null` si l'échéance n'est pas au kilométrage. */
export function deadlineKmRemaining(d: Deadline, currentMileage: number): number | null {
  if (d.dueMileage === undefined) return null
  return d.dueMileage - currentMileage
}

export function isDeadlineOverdue(d: Deadline, currentMileage: number): boolean {
  if (d.dueDate && isOverdue(d.dueDate)) return true
  const kmRemaining = deadlineKmRemaining(d, currentMileage)
  return kmRemaining !== null && kmRemaining <= 0
}

/** Texte d'échéance à venir (ex: "12 juin 2027 · dans 8 j · 1 200 km restants"). */
export function describeDeadline(d: Deadline, currentMileage: number): string {
  const parts: string[] = []
  if (d.dueDate) {
    parts.push(isOverdue(d.dueDate) ? `En retard depuis le ${fmtDate(d.dueDate)}` : `${fmtDate(d.dueDate)} · dans ${daysUntil(d.dueDate)} j`)
  }
  const kmRemaining = deadlineKmRemaining(d, currentMileage)
  if (kmRemaining !== null) {
    parts.push(kmRemaining <= 0 ? `${fmtKm(Math.abs(kmRemaining))} dépassés` : `${fmtKm(kmRemaining)} restants`)
  }
  return parts.join(' · ')
}

/** Texte d'échéance une fois marquée faite (juste la date/le kilométrage, sans urgence). */
export function describeDeadlineDone(d: Deadline): string {
  const parts: string[] = []
  if (d.dueDate) parts.push(fmtDate(d.dueDate))
  if (d.dueMileage !== undefined) parts.push(fmtKm(d.dueMileage))
  return parts.join(' · ')
}

export function deadlinesForVehicle(data: CarData, vehicleId: string): Deadline[] {
  const currentMileage = data.vehicles.find((v) => v.id === vehicleId)?.currentMileage ?? 0
  return [...data.deadlines.filter((d) => d.vehicleId === vehicleId)].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    const aRem = deadlineKmRemaining(a, currentMileage) ?? Infinity
    const bRem = deadlineKmRemaining(b, currentMileage) ?? Infinity
    return aRem - bRem
  })
}

export function logForVehicle(data: CarData, vehicleId: string): MaintenanceEntry[] {
  return [...data.maintenanceLog.filter((e) => e.vehicleId === vehicleId)].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
}

export function isMaintenanceDone(e: MaintenanceEntry): boolean {
  return e.done !== false
}

export function isDeadlineDone(d: Deadline): boolean {
  return d.done === true
}

/** Calcule la prochaine échéance (date et/ou kilométrage) d'une échéance récurrente une fois faite. */
export function nextDeadlineOccurrence(d: Deadline, currentMileage: number): { dueDate?: string; dueMileage?: number } {
  const next: { dueDate?: string; dueMileage?: number } = {}
  if (d.recurrenceMonths) {
    const base = parseDateKey(d.dueDate ?? toDateKey(new Date())) ?? new Date()
    base.setMonth(base.getMonth() + d.recurrenceMonths)
    next.dueDate = toDateKey(base)
  }
  if (d.recurrenceKm) {
    next.dueMileage = (d.dueMileage ?? currentMileage) + d.recurrenceKm
  }
  return next
}

export function describeDeadlineRecurrence(d: Deadline): string | null {
  const parts: string[] = []
  if (d.recurrenceMonths) parts.push(d.recurrenceMonths === 1 ? 'chaque mois' : `tous les ${d.recurrenceMonths} mois`)
  if (d.recurrenceKm) parts.push(`tous les ${fmtKm(d.recurrenceKm)}`)
  if (parts.length === 0) return null
  return '🔁 ' + parts.join(' ou ')
}

function daysBetween(a: string, b: string): number | null {
  const da = parseDateKey(a)
  const db = parseDateKey(b)
  if (!da || !db) return null
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

/**
 * Estime la périodicité d'un type d'entretien (ex: "Vidange") à partir de l'historique du même
 * véhicule — moyenne des écarts entre les enregistrements passés déjà faits — pour pré-remplir
 * une échéance récurrente sans que l'utilisateur ait à connaître/deviner l'intervalle exact.
 * Renvoie `null` s'il n'y a pas assez d'historique (moins de 2 entrées) pour estimer quoi que ce soit.
 */
export function estimateRecurrence(data: CarData, vehicleId: string, label: string): { months?: number; km?: number } | null {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return null
  const entries = data.maintenanceLog
    .filter((e) => e.vehicleId === vehicleId && e.label.trim().toLowerCase() === normalized && isMaintenanceDone(e))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (entries.length < 2) return null

  const span = daysBetween(entries[0].date, entries[entries.length - 1].date)
  const months = span !== null && span > 0 ? Math.max(1, Math.round(span / (entries.length - 1) / 30)) : undefined

  const withMileage = entries.filter((e) => e.mileage !== undefined)
  let km: number | undefined
  if (withMileage.length >= 2) {
    const kmSpan = withMileage[withMileage.length - 1].mileage! - withMileage[0].mileage!
    km = kmSpan > 0 ? Math.round(kmSpan / (withMileage.length - 1) / 100) * 100 : undefined
  }

  if (!months && !km) return null
  return { months, km }
}
