export type ChecklistItem = { id: string; text: string; done: boolean }

export function newChecklistItem(text: string): ChecklistItem {
  return { id: 'chk_' + Math.random().toString(36).slice(2, 10), text, done: false }
}
