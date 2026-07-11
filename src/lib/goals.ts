export const LINKED_MODULES = [
  'Finances',
  'Agenda',
  'Tâches',
  'Habitudes',
  'Voiture',
  'Documents',
  'Voyages',
] as const

export type LinkedModule = (typeof LINKED_MODULES)[number]

export type Goal = {
  id: string
  title: string
  description?: string
  targetDate?: string // 'YYYY-MM-DD'
  linkedModule?: LinkedModule
  progress: number // 0-100
  done: boolean
}

export type GoalsData = {
  goals: Goal[]
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isOverdue(goal: Goal): boolean {
  if (!goal.targetDate || goal.done) return false
  return goal.targetDate < toDateKey(new Date())
}

export function fmtDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function sortedGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aDate = a.targetDate ?? '9999-99-99'
    const bDate = b.targetDate ?? '9999-99-99'
    return aDate.localeCompare(bDate)
  })
}
