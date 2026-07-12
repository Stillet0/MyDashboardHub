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
}

/**
 * Pulls every dated, not-yet-done item from other modules (task deadlines, vehicle
 * deadlines, document expirations, health appointments/renewals, goal target dates) so
 * the Agenda can show them alongside calendar events, from today onward.
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
    if (t.done || !t.dueDate || t.dueDate < todayKey) return
    out.push({ id: 'task_' + t.id, title: t.title, date: t.dueDate, detail: t.category, module: 'Tâches' })
  })

  if (input.car) {
    const vehicleName = (id: string): string | undefined =>
      input.car!.vehicles.find((v: Vehicle) => v.id === id)?.name
    input.car.deadlines.forEach((d) => {
      // Une échéance uniquement au kilométrage n'a pas de date à placer sur le calendrier ;
      // elle reste visible dans le module Voiture et les rappels de l'Aperçu.
      if (isDeadlineDone(d) || !d.dueDate || d.dueDate < todayKey) return
      out.push({ id: 'car_' + d.id, title: d.label, date: d.dueDate, detail: vehicleName(d.vehicleId), module: 'Voiture' })
    })
    input.car.maintenanceLog.forEach((e) => {
      if (isMaintenanceDone(e) || e.date < todayKey) return
      out.push({ id: 'car_log_' + e.id, title: e.label, date: e.date, detail: vehicleName(e.vehicleId), module: 'Voiture' })
    })
  }

  input.documents?.documents.forEach((doc) => {
    if (!doc.expirationDate || doc.done || doc.expirationDate < todayKey) return
    out.push({ id: 'doc_' + doc.id, title: doc.name, date: doc.expirationDate, detail: doc.category, module: 'Documents' })
  })

  input.goals?.goals.forEach((g) => {
    if (g.done || !g.targetDate || g.targetDate < todayKey) return
    out.push({ id: 'goal_' + g.id, title: g.title, date: g.targetDate, detail: g.linkedModule, module: 'Objectifs' })
  })

  input.health?.appointments.forEach((a) => {
    if (a.done || a.date < todayKey) return
    out.push({ id: 'health_appt_' + a.id, title: a.title, date: a.date, time: a.time, detail: a.practitioner, module: 'Santé' })
  })
  input.health?.treatments.forEach((t) => {
    if (!t.renewalDate || t.renewalDate < todayKey) return
    out.push({
      id: 'health_trt_' + t.id,
      title: `Renouveler : ${t.name}`,
      date: t.renewalDate,
      detail: t.dosage,
      module: 'Santé',
    })
  })

  return out
}
