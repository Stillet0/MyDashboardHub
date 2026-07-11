export type Frequency = 'quotidien' | 'hebdo'

export type Habit = {
  id: string
  name: string
  frequency: Frequency
  color: string
  doneDates: string[] // 'YYYY-MM-DD', the specific day it was checked off
}

export type HabitsData = {
  habits: Habit[]
}

export const HABIT_COLORS = ['#F0A868', '#3ECF8E', '#5AA9A3', '#9B7EDE', '#EC6F6F', '#6FA8DC']

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** Monday-based ISO week key, e.g. '2026-W28'. */
export function weekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function isDoneOn(habit: Habit, dateKey: string): boolean {
  return habit.doneDates.includes(dateKey)
}

export function isDoneThisPeriod(habit: Habit, dateKey = todayKey()): boolean {
  if (habit.frequency === 'quotidien') return isDoneOn(habit, dateKey)
  const wk = weekKey(dateKey)
  return habit.doneDates.some((d) => weekKey(d) === wk)
}

/** Consecutive days (or weeks) up to and including today with at least one completion. */
export function currentStreak(habit: Habit): number {
  if (habit.doneDates.length === 0) return 0
  const done = new Set(habit.doneDates)
  let streak = 0
  if (habit.frequency === 'quotidien') {
    const cursor = new Date()
    if (!done.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1) // allow today to be still-pending
    while (done.has(toDateKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }
  const doneWeeks = new Set(habit.doneDates.map(weekKey))
  const cursor = new Date()
  if (!doneWeeks.has(weekKey(toDateKey(cursor)))) cursor.setDate(cursor.getDate() - 7)
  while (doneWeeks.has(weekKey(toDateKey(cursor)))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

/** Last `count` day-keys ending today, oldest first — for the mini heatmap. */
export function lastDays(count: number): string[] {
  const out: string[] = []
  const cursor = new Date()
  for (let i = 0; i < count; i++) {
    out.unshift(toDateKey(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return out
}
