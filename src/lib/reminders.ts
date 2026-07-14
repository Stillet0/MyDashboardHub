import type { TasksData } from './tasks'
import { deadlineKmRemaining, fmtKm, isDeadlineDone, isMaintenanceDone, type CarData, type Vehicle } from './car'
import type { DocumentsData } from './documents'
import type { GoalsData } from './goals'
import type { AgendaData, AgendaEvent } from './agenda'
import type { HabitsData } from './habits'
import type { HealthData } from './health'
import { fmtDate as fmtTravelDate, tripDocumentConflicts, type TravelData } from './travel'

export type Urgency = 'overdue' | 'today' | 'soon'

export type Reminder = {
  id: string
  module: 'Tâches' | 'Voiture' | 'Documents' | 'Objectifs' | 'Agenda' | 'Habitudes' | 'Santé' | 'Voyages'
  title: string
  detail?: string
  dueDate?: string
  urgency: Urgency
}

const SOON_WINDOW_DAYS = 7
// Seuils équivalents pour les échéances au kilométrage (ex: vidange dans 65 000 km) :
// pas de notion de "jour" pour un kilométrage, donc on approxime avec des paliers de distance.
const KM_TODAY_WINDOW = 300
const KM_SOON_WINDOW = 1000

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2 }

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function daysUntil(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function urgencyForDate(dateKey: string): Urgency | null {
  const days = daysUntil(dateKey)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= SOON_WINDOW_DAYS) return 'soon'
  return null
}

function urgencyForKm(kmRemaining: number): Urgency | null {
  if (kmRemaining <= 0) return 'overdue'
  if (kmRemaining <= KM_TODAY_WINDOW) return 'today'
  if (kmRemaining <= KM_SOON_WINDOW) return 'soon'
  return null
}

function mostUrgent(a: Urgency | null, b: Urgency | null): Urgency | null {
  if (!a) return b
  if (!b) return a
  return URGENCY_ORDER[a] <= URGENCY_ORDER[b] ? a : b
}

// Un passeport peut prendre des semaines à renouveler : contrairement aux autres échéances, ce
// rappel doit rester visible bien avant le départ plutôt que seulement dans les derniers jours.
function urgencyForTravelDocConflict(tripStartDate: string): Urgency {
  const days = daysUntil(tripStartDate)
  if (days < 0) return 'overdue'
  if (days <= 14) return 'today'
  return 'soon'
}

export function buildReminders(input: {
  tasks?: TasksData
  car?: CarData
  documents?: DocumentsData
  goals?: GoalsData
  agenda?: AgendaData
  googleEvents?: AgendaEvent[]
  habits?: HabitsData
  health?: HealthData
  travel?: TravelData
}): Reminder[] {
  const out: Reminder[] = []

  input.tasks?.tasks.forEach((t) => {
    if (t.done || !t.dueDate) return
    const urgency = urgencyForDate(t.dueDate)
    if (!urgency) return
    out.push({
      id: 'task_' + t.id,
      module: 'Tâches',
      title: t.title,
      detail: t.category,
      dueDate: t.dueDate,
      urgency,
    })
  })

  if (input.car) {
    const vehicleName = (id: string): string | undefined =>
      input.car!.vehicles.find((v: Vehicle) => v.id === id)?.name
    const vehicleMileage = (id: string): number => input.car!.vehicles.find((v: Vehicle) => v.id === id)?.currentMileage ?? 0
    input.car.deadlines.forEach((d) => {
      if (isDeadlineDone(d)) return
      const kmRemaining = deadlineKmRemaining(d, vehicleMileage(d.vehicleId))
      const urgency = mostUrgent(
        d.dueDate ? urgencyForDate(d.dueDate) : null,
        kmRemaining !== null ? urgencyForKm(kmRemaining) : null,
      )
      if (!urgency) return
      const detail = [
        vehicleName(d.vehicleId),
        kmRemaining !== null ? (kmRemaining <= 0 ? `${fmtKm(Math.abs(kmRemaining))} dépassés` : `${fmtKm(kmRemaining)} restants`) : undefined,
      ]
        .filter(Boolean)
        .join(' · ')
      out.push({
        id: 'car_' + d.id,
        module: 'Voiture',
        title: d.label,
        detail: detail || undefined,
        dueDate: d.dueDate,
        urgency,
      })
    })
    input.car.maintenanceLog.forEach((e) => {
      if (isMaintenanceDone(e)) return
      const urgency = urgencyForDate(e.date)
      if (!urgency) return
      out.push({
        id: 'car_log_' + e.id,
        module: 'Voiture',
        title: e.label,
        detail: vehicleName(e.vehicleId),
        dueDate: e.date,
        urgency,
      })
    })
  }

  input.documents?.documents.forEach((doc) => {
    if (!doc.expirationDate || doc.done) return
    const urgency = urgencyForDate(doc.expirationDate)
    if (!urgency) return
    out.push({
      id: 'doc_' + doc.id,
      module: 'Documents',
      title: doc.name,
      detail: doc.category,
      dueDate: doc.expirationDate,
      urgency,
    })
  })

  if (input.travel && input.documents) {
    tripDocumentConflicts(input.travel, input.documents.documents).forEach(({ trip, doc }) => {
      out.push({
        id: 'travel_doc_' + trip.id + '_' + doc.id,
        module: 'Voyages',
        title: `${doc.name} expire avant "${trip.name}"`,
        detail: `Expire le ${fmtTravelDate(doc.expirationDate!)} · départ ${fmtTravelDate(trip.startDate!)}`,
        dueDate: trip.startDate,
        urgency: urgencyForTravelDocConflict(trip.startDate!),
      })
    })
  }

  input.goals?.goals.forEach((g) => {
    if (g.done || !g.targetDate) return
    const urgency = urgencyForDate(g.targetDate)
    if (!urgency) return
    out.push({
      id: 'goal_' + g.id,
      module: 'Objectifs',
      title: g.title,
      detail: g.linkedModule,
      dueDate: g.targetDate,
      urgency,
    })
  })

  const todayKey = toDateKey(new Date())
  input.agenda?.events.forEach((e) => {
    if (e.date !== todayKey) return
    out.push({
      id: 'agenda_' + e.id,
      module: 'Agenda',
      title: e.title,
      detail: e.time ? `à ${e.time}` : undefined,
      dueDate: e.date,
      urgency: 'today',
    })
  })
  input.googleEvents?.forEach((e) => {
    if (e.date !== todayKey) return
    out.push({
      id: 'gcal_' + e.id,
      module: 'Agenda',
      title: e.title,
      detail: e.time ? `à ${e.time}` : undefined,
      dueDate: e.date,
      urgency: 'today',
    })
  })

  input.health?.appointments.forEach((a) => {
    if (a.done) return
    const urgency = urgencyForDate(a.date)
    if (!urgency) return
    out.push({
      id: 'health_appt_' + a.id,
      module: 'Santé',
      title: a.title,
      detail: a.practitioner,
      dueDate: a.date,
      urgency,
    })
  })

  input.health?.treatments.forEach((t) => {
    if (!t.renewalDate) return
    const urgency = urgencyForDate(t.renewalDate)
    if (!urgency) return
    out.push({
      id: 'health_trt_' + t.id,
      module: 'Santé',
      title: `Renouveler : ${t.name}`,
      detail: t.dosage,
      dueDate: t.renewalDate,
      urgency,
    })
  })

  input.habits?.habits.forEach((h) => {
    if (h.frequency !== 'quotidien') return
    const doneToday = h.doneDates.includes(todayKey)
    if (doneToday) return
    // A running streak of 2+ days is worth protecting with a reminder.
    const yesterday = toDateKey(new Date(Date.now() - 86400000))
    if (!h.doneDates.includes(yesterday)) return
    out.push({
      id: 'habit_' + h.id,
      module: 'Habitudes',
      title: h.name,
      detail: 'Série en cours à ne pas casser',
      urgency: 'today',
    })
  })

  return out.sort((a, b) => {
    if (URGENCY_ORDER[a.urgency] !== URGENCY_ORDER[b.urgency]) return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  })
}
