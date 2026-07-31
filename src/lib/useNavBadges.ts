import { useTasksData } from './useTasksData'
import { useCarData } from './useCarData'
import { useDocumentsData } from './useDocumentsData'
import { useGoalsData } from './useGoalsData'
import { useAgendaData } from './useAgendaData'
import { useHabitsData } from './useHabitsData'
import { useHealthData } from './useHealthData'
import { useTravelData } from './useTravelData'
import { useContactsData } from './useContactsData'
import { useNotesData } from './useNotesData'
import { buildReminders, type Reminder } from './reminders'

export type NavBadge = { count: number; overdue: boolean }

/** Compte, par module, le nombre de rappels en cours — pour les pastilles de la barre de navigation. */
export function useNavBadges(): Partial<Record<Reminder['module'], NavBadge>> {
  const { data: tasks } = useTasksData()
  const { data: car } = useCarData()
  const { data: documents } = useDocumentsData()
  const { data: goals } = useGoalsData()
  const { data: agenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const { data: health } = useHealthData()
  const { data: travel } = useTravelData()
  const { data: contacts } = useContactsData()
  const { data: notes } = useNotesData()

  const reminders = buildReminders({
    tasks: tasks ?? undefined,
    car: car ?? undefined,
    documents: documents ?? undefined,
    goals: goals ?? undefined,
    agenda: agenda ?? undefined,
    habits: habits ?? undefined,
    health: health ?? undefined,
    travel: travel ?? undefined,
    contacts: contacts ?? undefined,
    notes: notes ?? undefined,
  })

  const out: Partial<Record<Reminder['module'], NavBadge>> = {}
  reminders.forEach((r) => {
    const existing = out[r.module] ?? { count: 0, overdue: false }
    out[r.module] = { count: existing.count + 1, overdue: existing.overdue || r.urgency === 'overdue' }
  })
  return out
}
