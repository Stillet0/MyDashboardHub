import { useSyncedJson } from './useSyncedJson'
import type { DocumentsData } from './documents'

const PATH = 'data/documents.json'
const DEFAULT: DocumentsData = { documents: [], categories: [] }

export function useDocumentsData() {
  return useSyncedJson<DocumentsData>(PATH, DEFAULT)
}
