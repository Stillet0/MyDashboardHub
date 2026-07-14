import type { ChecklistItem } from './checklist'
import type { Recurrence } from './recurrence'

export type Priority = 'basse' | 'normale' | 'haute'

export type Category = { name: string; color: string }

export type Task = {
  id: string
  title: string
  category?: string
  priority: Priority
  dueDate?: string // 'YYYY-MM-DD'
  done: boolean
  notes?: string
  subtasks?: ChecklistItem[]
  recurrence?: Recurrence
}

export type TasksData = {
  tasks: Task[]
  categories: Category[]
}

const PRIORITY_RANK: Record<Priority, number> = { haute: 0, normale: 1, basse: 2 }

export function sortedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aDue = a.dueDate ?? '9999-99'
    const bDue = b.dueDate ?? '9999-99'
    if (aDue !== bDue) return aDue.localeCompare(bDue)
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  })
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.done) return false
  return task.dueDate < toDateKey(new Date())
}

// Un champ date mal formé (ex: renvoyé par l'IA de l'Ajout rapide sans respecter strictement
// "YYYY-MM-DD") ne doit jamais faire planter tout l'écran : on retombe sur une valeur neutre
// plutôt que de laisser `Intl.DateTimeFormat` lever une exception non rattrapée.
export function fmtDueDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey)
  if (!match) return dateKey
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

export function categoryColor(data: TasksData, name: string | undefined): string {
  if (!name) return '#8B93A1'
  return data.categories.find((c) => c.name === name)?.color ?? '#8B93A1'
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  haute: 'var(--red)',
  normale: 'var(--gold)',
  basse: 'var(--text-muted)',
}
