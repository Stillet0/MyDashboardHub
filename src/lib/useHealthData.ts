import { useSyncedJson } from './useSyncedJson'
import type { HealthData } from './health'

const PATH = 'data/sante.json'
const DEFAULT: HealthData = { appointments: [], treatments: [] }

export function useHealthData() {
  return useSyncedJson<HealthData>(PATH, DEFAULT)
}
