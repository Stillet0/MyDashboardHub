import type { TasksData } from './tasks'
import { deadlineKmRemaining, fmtKm, isDeadlineDone, isMaintenanceDone, type CarData, type Vehicle } from './car'
import type { DocumentsData } from './documents'
import type { GoalsData } from './goals'
import type { HealthData } from './health'
import { toDateKey } from './agenda'

export type ExternalAgendaModule = 'Tâches' | 'Voiture' | 'Documents' | 'Santé' | 'Objectifs'

export type ExternalAgendaItem = {
  id: string
  title: string
  // Absent uniquement pour une échéance voiture au kilométrage (pas de date à placer sur un
  // calendrier) déjà dépassée : elle n'a de sens que dans la section "En retard", jamais dans
  // les groupes par date.
  date?: string // 'YYYY-MM-DD'
  time?: string
  detail?: string
  module: ExternalAgendaModule
  overdue: boolean
}

/**
 * Pulls every dated, not-yet-done item from other modules (task deadlines, vehicle
 * deadlines, document expirations, health appointments/renewals, goal target dates) so
 * the Agenda can show them alongside calendar events. Past-dated items aren't dropped
 * anymore : they're flagged `overdue` so the Agenda can surface them as "En retard"
 * instead of silently disappearing once their date has passed.
 */
export function buildExternalAgendaItems(input: {
  tasks?: TasksData
  car?: CarData
  documents?: DocumentsData
  goals?: GoalsData
  health?: HealthData
}): ExternalAgendaItem[] {
  const todayKey = toDateKey(new Date())
  const out: ExternalAgendaItem[] = []

  input.tasks?.tasks.forEach((t) => {
    if (t.done || !t.dueDate) return
    out.push({ id: 'task_' + t.id, title: t.title, date: t.dueDate, detail: t.category, module: 'Tâches', overdue: t.dueDate < todayKey })
  })

  if (input.car) {
    const vehicleName = (id: string): string | undefined =>
      input.car!.vehicles.find((v: Vehicle) => v.id === id)?.name
    const vehicleMileage = (id: string): number => input.car!.vehicles.find((v: Vehicle) => v.id === id)?.currentMileage ?? 0
    input.car.deadlines.forEach((d) => {
      if (isDeadlineDone(d)) return
      if (d.dueDate) {
        out.push({
          id: 'car_' + d.id,
          title: d.label,
          date: d.dueDate,
          detail: vehicleName(d.vehicleId),
          module: 'Voiture',
          overdue: d.dueDate < todayKey,
        })
        return
      }
      // Une échéance uniquement au kilométrage n'a pas de date à placer sur le calendrier —
      // mais si elle est déjà dépassée, elle a sa place dans la section "En retard" au même
      // titre qu'une échéance datée en retard, plutôt que de rester invisible dans l'Agenda.
      const kmRemaining = deadlineKmRemaining(d, vehicleMileage(d.vehicleId))
      if (kmRemaining === null || kmRemaining > 0) return
      out.push({
        id: 'car_' + d.id,
        title: d.label,
        detail: [vehicleName(d.vehicleId), `${fmtKm(Math.abs(kmRemaining))} dépassés`].filter(Boolean).join(' · '),
        module: 'Voiture',
        overdue: true,
      })
    })
    input.car.maintenanceLog.forEach((e) => {
      if (isMaintenanceDone(e)) return
      out.push({
        id: 'car_log_' + e.id,
        title: e.label,
        date: e.date,
        detail: vehicleName(e.vehicleId),
        module: 'Voiture',
        overdue: e.date < todayKey,
      })
    })
  }

  input.documents?.documents.forEach((doc) => {
    if (!doc.expirationDate || doc.done) return
    out.push({
      id: 'doc_' + doc.id,
      title: doc.name,
      date: doc.expirationDate,
      detail: doc.category,
      module: 'Documents',
      overdue: doc.expirationDate < todayKey,
    })
  })

  input.goals?.goals.forEach((g) => {
    if (g.done || !g.targetDate) return
    out.push({
      id: 'goal_' + g.id,
      title: g.title,
      date: g.targetDate,
      detail: g.linkedModule,
      module: 'Objectifs',
      overdue: g.targetDate < todayKey,
    })
  })

  input.health?.appointments.forEach((a) => {
    if (a.done) return
    out.push({
      id: 'health_appt_' + a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      detail: a.practitioner,
      module: 'Santé',
      overdue: a.date < todayKey,
    })
  })
  input.health?.treatments.forEach((t) => {
    if (!t.renewalDate) return
    out.push({
      id: 'health_trt_' + t.id,
      title: `Renouveler : ${t.name}`,
      date: t.renewalDate,
      detail: t.dosage,
      module: 'Santé',
      overdue: t.renewalDate < todayKey,
    })
  })

  return out
}
