import type { TasksData } from './tasks'
import type { AgendaData } from './agenda'
import type { HabitsData } from './habits'
import type { CarData } from './car'
import type { DocumentsData } from './documents'
import type { HealthData } from './health'
import type { GoalsData } from './goals'
import type { TravelData } from './travel'
import type { NotesData, NoteRefModule } from './notes'
import type { ContactsData } from './contacts'

export type SearchModule = NoteRefModule | 'Notes'

export type SearchItem = { id: string; rawId: string; title: string; detail?: string; module: SearchModule }

export function buildSearchIndex(input: {
  tasks?: TasksData
  agenda?: AgendaData
  habits?: HabitsData
  car?: CarData
  documents?: DocumentsData
  health?: HealthData
  goals?: GoalsData
  travel?: TravelData
  notes?: NotesData
  contacts?: ContactsData
}): SearchItem[] {
  const out: SearchItem[] = []

  input.tasks?.tasks.forEach((t) =>
    out.push({ id: 'task_' + t.id, rawId: t.id, title: t.title, detail: t.category, module: 'Tâches' }),
  )
  input.agenda?.events.forEach((e) =>
    out.push({ id: 'evt_' + e.id, rawId: e.id, title: e.title, detail: e.location, module: 'Agenda' }),
  )
  input.habits?.habits.forEach((h) => out.push({ id: 'habit_' + h.id, rawId: h.id, title: h.name, module: 'Habitudes' }))

  if (input.car) {
    input.car.vehicles.forEach((v) => out.push({ id: 'veh_' + v.id, rawId: v.id, title: v.name, module: 'Voiture' }))
    input.car.deadlines.forEach((d) => out.push({ id: 'dl_' + d.id, rawId: d.id, title: d.label, module: 'Voiture' }))
    input.car.maintenanceLog.forEach((m) => out.push({ id: 'log_' + m.id, rawId: m.id, title: m.label, module: 'Voiture' }))
  }

  input.documents?.documents.forEach((d) =>
    out.push({ id: 'doc_' + d.id, rawId: d.id, title: d.name, detail: d.category, module: 'Documents' }),
  )

  if (input.health) {
    input.health.appointments.forEach((a) =>
      out.push({ id: 'appt_' + a.id, rawId: a.id, title: a.title, detail: a.practitioner, module: 'Santé' }),
    )
    input.health.treatments.forEach((t) => out.push({ id: 'trt_' + t.id, rawId: t.id, title: t.name, module: 'Santé' }))
  }

  input.goals?.goals.forEach((g) => out.push({ id: 'goal_' + g.id, rawId: g.id, title: g.title, module: 'Objectifs' }))
  input.contacts?.contacts.forEach((c) =>
    out.push({ id: 'contact_' + c.id, rawId: c.id, title: c.name, detail: c.relationship, module: 'Contacts' }),
  )
  input.travel?.trips.forEach((tr) =>
    out.push({ id: 'trip_' + tr.id, rawId: tr.id, title: tr.name, detail: tr.destination, module: 'Voyages' }),
  )
  input.notes?.notes.forEach((n) =>
    out.push({
      id: 'note_' + n.id,
      rawId: n.id,
      title: n.title,
      detail: [n.space, ...(n.tags ?? []), n.body].join(' '),
      module: 'Notes',
    }),
  )

  return out
}

export function searchItems(index: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index.filter((i) => i.title.toLowerCase().includes(q) || i.detail?.toLowerCase().includes(q)).slice(0, 8)
}
