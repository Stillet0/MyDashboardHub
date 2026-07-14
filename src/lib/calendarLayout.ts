import { toDateKey } from './agenda'

export type CalendarView = 'jour' | 'semaine' | 'mois'

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

/** Lundi de la semaine contenant `date` (convention française). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Grille de 42 jours (6 semaines, lundi-dimanche) couvrant le mois de `date`, avec les jours des mois adjacents. */
export function monthGridDays(date: Date): Date[] {
  const firstOfMonth = startOfMonth(date)
  const gridStart = startOfWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export const HOUR_HEIGHT = 48
export const DAY_GRID_HEIGHT = HOUR_HEIGHT * 24
const DEFAULT_DURATION_MIN = 60
const MIN_BLOCK_MIN = 30

/** Position/hauteur en pixels d'un bloc d'événement dans la grille horaire d'une journée. */
export function eventBlockStyle(time: string, endTime?: string): { top: number; height: number } | null {
  const startMin = timeToMinutes(time)
  if (startMin === null) return null
  const endMin = endTime ? timeToMinutes(endTime) : null
  const durationMin = endMin !== null && endMin > startMin ? endMin - startMin : DEFAULT_DURATION_MIN
  const top = (startMin / 60) * HOUR_HEIGHT
  const height = Math.max((durationMin / 60) * HOUR_HEIGHT, MIN_BLOCK_MIN / 60 * HOUR_HEIGHT)
  return { top, height }
}

export { toDateKey }
