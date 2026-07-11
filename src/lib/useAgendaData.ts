import { useSyncedJson } from './useSyncedJson'
import type { AgendaData } from './agenda'

const PATH = 'data/agenda.json'
const DEFAULT: AgendaData = { events: [] }

export function useAgendaData() {
  return useSyncedJson<AgendaData>(PATH, DEFAULT)
}
