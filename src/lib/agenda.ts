export type EventSource = 'local' | 'google'

export type AgendaEvent = {
  id: string
  title: string
  date: string // 'YYYY-MM-DD'
  time?: string // 'HH:MM'
  endTime?: string
  location?: string
  notes?: string
  source?: EventSource // undefined = local; set on events merged in from Google Calendar
}

export type AgendaData = {
  events: AgendaEvent[]
}

export function sortedEvents(data: AgendaData): AgendaEvent[] {
  return [...data.events].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return (a.time ?? '').localeCompare(b.time ?? '')
  })
}

export function upcomingEvents(data: AgendaData, fromDate = new Date()): AgendaEvent[] {
  const todayKey = toDateKey(fromDate)
  return sortedEvents(data).filter((e) => e.date >= todayKey)
}

export function pastEvents(data: AgendaData, fromDate = new Date()): AgendaEvent[] {
  const todayKey = toDateKey(fromDate)
  return sortedEvents(data)
    .filter((e) => e.date < todayKey)
    .reverse()
}

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function fmtEventDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date())
}
