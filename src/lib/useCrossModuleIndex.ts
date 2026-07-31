import { useTasksData } from './useTasksData'
import { useAgendaData } from './useAgendaData'
import { useHabitsData } from './useHabitsData'
import { useCarData } from './useCarData'
import { useDocumentsData } from './useDocumentsData'
import { useHealthData } from './useHealthData'
import { useGoalsData } from './useGoalsData'
import { useTravelData } from './useTravelData'
import { buildSearchIndex, type SearchItem } from './searchIndex'

/** Catalogue de tous les éléments des autres modules, pour rattacher une note à l'un d'eux. */
export function useCrossModuleIndex(): SearchItem[] {
  const { data: tasks } = useTasksData()
  const { data: agenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const { data: car } = useCarData()
  const { data: documents } = useDocumentsData()
  const { data: health } = useHealthData()
  const { data: goals } = useGoalsData()
  const { data: travel } = useTravelData()

  return buildSearchIndex({
    tasks: tasks ?? undefined,
    agenda: agenda ?? undefined,
    habits: habits ?? undefined,
    car: car ?? undefined,
    documents: documents ?? undefined,
    health: health ?? undefined,
    goals: goals ?? undefined,
    travel: travel ?? undefined,
  })
}
