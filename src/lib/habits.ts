export type Frequency = 'quotidien' | 'hebdo' | 'intervalle'

export type Habit = {
  id: string
  name: string
  frequency: Frequency
  intervalDays?: number // uniquement si frequency === 'intervalle' (ex: tous les 2, 3, 4 jours...)
  color: string
  doneDates: string[] // 'YYYY-MM-DD', the specific day it was checked off
}

export type HabitsData = {
  habits: Habit[]
}

export const HABIT_COLORS = ['#F0A868', '#3ECF8E', '#5AA9A3', '#9B7EDE', '#EC6F6F', '#6FA8DC']

export const INTERVAL_PRESETS = [2, 3, 4, 5, 7, 10, 14]

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function todayKey(): string {
  return toDateKey(new Date())
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86400000)
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

export function fmtFrequency(habit: Habit): string {
  if (habit.frequency === 'quotidien') return 'Quotidien'
  if (habit.frequency === 'hebdo') return 'Hebdomadaire'
  const n = habit.intervalDays ?? 1
  return `Tous les ${n} jours`
}

export function isDoneThisPeriod(habit: Habit, dateKey = todayKey()): boolean {
  if (habit.frequency === 'hebdo') {
    const wk = weekKey(dateKey)
    return habit.doneDates.some((d) => weekKey(d) === wk)
  }
  if (habit.frequency === 'intervalle') {
    const n = habit.intervalDays ?? 1
    const lastDone = [...habit.doneDates].sort().pop()
    if (!lastDone) return false
    return daysBetween(lastDone, dateKey) < n
  }
  return isDoneOn(habit, dateKey)
}

/**
 * Série en cours (jours/semaines/périodes consécutives) jusqu'à une date de référence donnée —
 * `from` sert aussi à reconstituer la longueur d'une série passée au moment où elle s'est
 * rompue (voir `brokenStreak`), pas seulement la série actuelle.
 */
export function currentStreak(habit: Habit, from: Date = new Date()): number {
  if (habit.doneDates.length === 0) return 0
  const done = new Set(habit.doneDates)
  let streak = 0

  if (habit.frequency === 'hebdo') {
    const doneWeeks = new Set(habit.doneDates.map(weekKey))
    const cursor = new Date(from)
    if (!doneWeeks.has(weekKey(toDateKey(cursor)))) cursor.setDate(cursor.getDate() - 7)
    while (doneWeeks.has(weekKey(toDateKey(cursor)))) {
      streak++
      cursor.setDate(cursor.getDate() - 7)
    }
    return streak
  }

  if (habit.frequency === 'intervalle') {
    const n = habit.intervalDays ?? 1
    const dates = [...new Set(habit.doneDates)].sort().reverse() // plus récent d'abord
    const fromKey = toDateKey(from)
    // Une complétion à `from` compte, sinon on autorise jusqu'à `n` jours de battement avant
    // de considérer la série comme déjà rompue.
    const lapsed = daysBetween(dates[0], fromKey) > n
    if (lapsed) return 0
    streak = 1
    for (let i = 0; i < dates.length - 1; i++) {
      if (daysBetween(dates[i + 1], dates[i]) <= n) streak++
      else break
    }
    return streak
  }

  const cursor = new Date(from)
  if (!done.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1) // allow today to be still-pending
  while (done.has(toDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * Si une série d'au moins 2 périodes vient de se rompre (plus aucune série active
 * aujourd'hui, alors qu'il y en avait une au moment de la dernière complétion), renvoie sa
 * longueur — pour prévenir activement plutôt que de laisser la série retomber à 0 en silence.
 */
export function brokenStreak(habit: Habit): { length: number } | null {
  if (habit.doneDates.length === 0) return null
  if (currentStreak(habit) > 0) return null
  const lastDone = [...habit.doneDates].sort().pop()!
  const previous = currentStreak(habit, parseDateKey(lastDone))
  if (previous < 2) return null
  return { length: previous }
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
