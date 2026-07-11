import { useSyncedJson } from './useSyncedJson'
import type { CarData } from './car'

const PATH = 'data/voiture.json'
const DEFAULT: CarData = { vehicles: [], deadlines: [], maintenanceLog: [] }

export function useCarData() {
  return useSyncedJson<CarData>(PATH, DEFAULT)
}
