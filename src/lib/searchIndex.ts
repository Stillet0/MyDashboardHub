import type { TasksData } from './tasks'
import type { AgendaData } from './agenda'
import type { HabitsData } from './habits'
import type { CarData } from './car'
import type { DocumentsData } from './documents'
import type { HealthData } from './health'
import type { GoalsData } from './goals'
import type { TravelData } from './travel'

export type SearchModule = 'Tâches' | 'Agenda' | 'Habitudes' | 'Voiture' | 'Documents' | 'Santé' | 'Objectifs' | 'Voyages'

export type SearchItem = { id: string; title: string; detail?: string; module: SearchModule }

export function buildSearchIndex(input: {
  tasks?: TasksData
  agenda?: AgendaData
  habits?: HabitsData
  car?: CarData
  documents?: DocumentsData
  health?: HealthData
  goals?: GoalsData
  travel?: TravelData
}): SearchItem[] {
  const out: SearchItem[] = []

  input.tasks?.tasks.forEach((t) => out.push({ id: 'task_' + t.id, title: t.title, detail: t.category, module: 'Tâches' }))
  input.agenda?.events.forEach((e) => out.push({ id: 'evt_' + e.id, title: e.title, detail: e.location, module: 'Agenda' }))
  input.habits?.habits.forEach((h) => out.push({ id: 'habit_' + h.id, title: h.name, module: 'Habitudes' }))

  if (input.car) {
    input.car.vehicles.forEach((v) => out.push({ id: 'veh_' + v.id, title: v.name, module: 'Voiture' }))
    input.car.deadlines.forEach((d) => out.push({ id: 'dl_' + d.id, title: d.label, module: 'Voiture' }))
    input.car.maintenanceLog.forEach((m) => out.push({ id: 'log_' + m.id, title: m.label, module: 'Voiture' }))
  }

  input.documents?.documents.forEach((d) => out.push({ id: 'doc_' + d.id, title: d.name, detail: d.category, module: 'Documents' }))

  if (input.health) {
    input.health.appointments.forEach((a) =>
      out.push({ id: 'appt_' + a.id, title: a.title, detail: a.practitioner, module: 'Santé' }),
    )
    input.health.treatments.forEach((t) => out.push({ id: 'trt_' + t.id, title: t.name, module: 'Santé' }))
  }

  input.goals?.goals.forEach((g) => out.push({ id: 'goal_' + g.id, title: g.title, module: 'Objectifs' }))
  input.travel?.trips.forEach((tr) => out.push({ id: 'trip_' + tr.id, title: tr.name, detail: tr.destination, module: 'Voyages' }))

  return out
}

export function searchItems(index: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index.filter((i) => i.title.toLowerCase().includes(q) || i.detail?.toLowerCase().includes(q)).slice(0, 8)
}
