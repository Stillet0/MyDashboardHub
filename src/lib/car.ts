export type Vehicle = { id: string; name: string; currentMileage: number }

export type Deadline = {
  id: string
  vehicleId: string
  label: string
  dueDate: string // 'YYYY-MM-DD'
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

export function deadlinesForVehicle(data: CarData, vehicleId: string): Deadline[] {
  return [...data.deadlines.filter((d) => d.vehicleId === vehicleId)].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )
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
