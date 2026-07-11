import { useSyncedJson } from './useSyncedJson'
import type { TasksData } from './tasks'

const PATH = 'data/taches.json'
const DEFAULT: TasksData = { tasks: [], categories: [] }

export function useTasksData() {
  return useSyncedJson<TasksData>(PATH, DEFAULT)
}
