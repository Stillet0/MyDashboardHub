import { useSyncedJson } from './useSyncedJson'
import type { NotesData } from './notes'

const PATH = 'data/notes.json'
const DEFAULT: NotesData = { notes: [] }

export function useNotesData() {
  return useSyncedJson<NotesData>(PATH, DEFAULT)
}
