import { useSyncedJson } from './useSyncedJson'
import type { TravelData } from './travel'

const PATH = 'data/voyages.json'
const DEFAULT: TravelData = { trips: [], expenses: [] }

export function useTravelData() {
  return useSyncedJson<TravelData>(PATH, DEFAULT)
}
