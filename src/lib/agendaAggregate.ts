import type { TasksData } from './tasks'
import { isDeadlineDone, isMaintenanceDone, type CarData, type Vehicle } from './car'
import type { DocumentsData } from './documents'
import type { GoalsData } from './goals'
import type { HealthData } from './health'
import { toDateKey } from './agenda'

export type ExternalAgendaModule = 'Tâches' | 'Voiture' | 'Documents' | 'Santé' | 'Objectifs'

export type ExternalAgendaItem = {
  id: string
  title: string
  date: string // 'YYYY-MM-DD'
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
    input.car.deadlines.forEach((d) => {
      // Une échéance uniquement au kilométrage n'a pas de date à placer sur le calendrier ;
      // elle reste visible dans le module Voiture et les rappels de l'Aperçu.
      if (isDeadlineDone(d) || !d.dueDate) return
      out.push({
        id: 'car_' + d.id,
        title: d.label,
        date: d.dueDate,
        detail: vehicleName(d.vehicleId),
        module: 'Voiture',
        overdue: d.dueDate < todayKey,
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
