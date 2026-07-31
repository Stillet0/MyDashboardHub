import { useSyncedJson } from './useSyncedJson'
import type { ContactsData } from './contacts'

const PATH = 'data/contacts.json'
const DEFAULT: ContactsData = { contacts: [] }

export function useContactsData() {
  return useSyncedJson<ContactsData>(PATH, DEFAULT)
}
