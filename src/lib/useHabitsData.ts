import { useSyncedJson } from './useSyncedJson'
import type { HabitsData } from './habits'

const PATH = 'data/habitudes.json'
const DEFAULT: HabitsData = { habits: [] }

export function useHabitsData() {
  return useSyncedJson<HabitsData>(PATH, DEFAULT)
}
