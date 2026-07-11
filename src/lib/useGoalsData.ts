import { useSyncedJson } from './useSyncedJson'
import type { GoalsData } from './goals'

const PATH = 'data/objectifs.json'
const DEFAULT: GoalsData = { goals: [] }

export function useGoalsData() {
  return useSyncedJson<GoalsData>(PATH, DEFAULT)
}
