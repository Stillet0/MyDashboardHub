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

// Un champ date mal formé (ex: renvoyé par l'IA de l'Ajout rapide sans respecter strictement
// "YYYY-MM-DD") ne doit jamais faire planter tout l'écran : on retombe sur une valeur neutre
// plutôt que de laisser `Intl.DateTimeFormat` lever une exception non rattrapée.
export function fmtEventDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey)
  if (!match) return dateKey
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return dateKey
  const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date())
}
