import type { TasksData } from './tasks'
import type { CarData, Vehicle } from './car'
import type { DocumentsData } from './documents'
import type { GoalsData } from './goals'
import type { AgendaData, AgendaEvent } from './agenda'
import type { HabitsData } from './habits'

export type Urgency = 'overdue' | 'today' | 'soon'

export type Reminder = {
  id: string
  module: 'Tâches' | 'Voiture' | 'Documents' | 'Objectifs' | 'Agenda' | 'Habitudes'
  title: string
  detail?: string
  dueDate?: string
  urgency: Urgency
}

const SOON_WINDOW_DAYS = 7

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

export function buildReminders(input: {
  tasks?: TasksData
  car?: CarData
  documents?: DocumentsData
  goals?: GoalsData
  agenda?: AgendaData
  googleEvents?: AgendaEvent[]
  habits?: HabitsData
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
    input.car.deadlines.forEach((d) => {
      const urgency = urgencyForDate(d.dueDate)
      if (!urgency) return
      out.push({
        id: 'car_' + d.id,
        module: 'Voiture',
        title: d.label,
        detail: vehicleName(d.vehicleId),
        dueDate: d.dueDate,
        urgency,
      })
    })
  }

  input.documents?.documents.forEach((doc) => {
    if (!doc.expirationDate) return
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

  const order: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2 }
  return out.sort((a, b) => {
    if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  })
}
