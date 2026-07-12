export type Vehicle = { id: string; name: string; currentMileage: number }

export type Deadline = {
  id: string
  vehicleId: string
  label: string
  dueDate?: string // 'YYYY-MM-DD' — au moins l'un des deux (dueDate / dueMileage) doit être renseigné
  dueMileage?: number // ex: vidange due à 65 000 km
  notes?: string
  done?: boolean // absent = pas fait (comportement historique, avant l'ajout de ce champ)
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

export function daysUntil(dueDate: string): number {
  const [y, m, d] = dueDate.split('-').map(Number)
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
