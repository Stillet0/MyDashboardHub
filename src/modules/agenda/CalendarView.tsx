import { useEffect, useRef } from 'react'
import {
  DAY_GRID_HEIGHT,
  HOUR_HEIGHT,
  eventBlockStyle,
  monthGridDays,
  toDateKey,
  weekDays,
  type CalendarView as ViewMode,
} from '../../lib/calendarLayout'
import { isToday } from '../../lib/agenda'

export type CalendarEventItem = {
  id: string
  title: string
  date: string
  time?: string
  endTime?: string
  subtitle?: string
  accent: string
  onClick?: () => void
}

type Props = {
  view: ViewMode
  anchorDate: Date
  items: CalendarEventItem[]
  onSelectDay: (date: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const DAY_NUM_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' })
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

function fmtHour(h: number): string {
  return String(h).padStart(2, '0') + ':00'
}

function nowOffset(): number {
  const now = new Date()
  return (now.getHours() * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60)
}

function splitDayItems(items: CalendarEventItem[], dateKey: string) {
  const dayItems = items.filter((e) => e.date === dateKey)
  const timed = dayItems.filter((e) => e.time && eventBlockStyle(e.time, e.endTime))
  const untimed = dayItems.filter((e) => !e.time || !eventBlockStyle(e.time, e.endTime))
  return { timed, untimed }
}

function AllDayChips({ items, dateKey }: { items: CalendarEventItem[]; dateKey: string }) {
  const { untimed } = splitDayItems(items, dateKey)
  if (untimed.length === 0) return null
  return (
    <div className="space-y-1 p-1">
      {untimed.map((e) => (
        <button
          key={e.id}
          onClick={e.onClick}
          className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-[#08090b]"
          style={{ background: e.accent }}
          title={e.title}
        >
          {e.title}
        </button>
      ))}
    </div>
  )
}

function HourGrid({ items, dateKey }: { items: CalendarEventItem[]; dateKey: string }) {
  const { timed } = splitDayItems(items, dateKey)
  return (
    <div className="relative" style={{ height: DAY_GRID_HEIGHT }}>
      {HOURS.map((h) => (
        <div key={h} className="absolute inset-x-0 border-t border-[var(--border)]" style={{ top: h * HOUR_HEIGHT }} />
      ))}
      {isToday(dateKey) && (
        <div className="absolute inset-x-0 z-10 border-t-2 border-[var(--red)]" style={{ top: nowOffset() }} />
      )}
      {timed.map((e) => {
        const style = eventBlockStyle(e.time!, e.endTime)
        if (!style) return null
        return (
          <button
            key={e.id}
            onClick={e.onClick}
            className="absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-[#08090b]"
            style={{ top: style.top, height: style.height, background: e.accent }}
            title={`${e.time}${e.endTime ? '–' + e.endTime : ''} · ${e.title}`}
          >
            <div className="font-semibold">{e.time}</div>
            <div className="truncate">{e.title}</div>
          </button>
        )
      })}
    </div>
  )
}

function HourGutter() {
  return (
    <div className="w-12 shrink-0">
      <div className="h-6" />
      {HOURS.map((h) => (
        <div key={h} style={{ height: HOUR_HEIGHT }} className="pr-1.5 text-right text-[10px] text-[var(--text-faint)]">
          <span className="relative -top-1.5">{fmtHour(h)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CalendarView({ view, anchorDate, items, onSelectDay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if ((view === 'jour' || view === 'semaine') && scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [view, anchorDate])

  if (view === 'mois') {
    const days = monthGridDays(anchorDate)
    const month = anchorDate.getMonth()
    return (
      <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          {days.slice(0, 7).map((d) => (
            <div key={d.toISOString()} className="py-2 font-medium">
              {WEEKDAY_FMT.format(d)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const dateKey = toDateKey(d)
            const dayItems = items.filter((e) => e.date === dateKey)
            const inMonth = d.getMonth() === month
            return (
              <button
                key={dateKey}
                onClick={() => onSelectDay(d)}
                className={`min-h-[84px] border-b border-r border-[var(--border)] p-1.5 text-left align-top last:border-r-0 ${
                  inMonth ? '' : 'opacity-40'
                }`}
              >
                <div
                  className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday(dateKey) ? 'bg-[var(--gold)] text-[#1a1408] font-semibold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {DAY_NUM_FMT.format(d)}
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] text-[#08090b]"
                      style={{ background: e.accent }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-[var(--text-faint)]">+{dayItems.length - 3} de plus</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const days = view === 'semaine' ? weekDays(anchorDate) : [anchorDate]

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex border-b border-[var(--border)]">
        <div className="w-12 shrink-0" />
        {days.map((d) => {
          const dateKey = toDateKey(d)
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDay(d)}
              className="flex-1 border-l border-[var(--border)] py-2 text-center first:border-l-0"
            >
              <div className="text-[10px] text-[var(--text-muted)]">{WEEKDAY_FMT.format(d)}</div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday(dateKey) ? 'bg-[var(--gold)] font-semibold text-[#1a1408]' : ''
                }`}
              >
                {DAY_NUM_FMT.format(d)}
                {view === 'jour' ? ' ' + MONTH_FMT.format(d) : ''}
              </div>
            </button>
          )
        })}
      </div>
      {days.some((d) => splitDayItems(items, toDateKey(d)).untimed.length > 0) && (
        <div className="flex border-b border-[var(--border)]">
          <div className="w-12 shrink-0" />
          {days.map((d) => {
            const dateKey = toDateKey(d)
            return (
              <div key={dateKey} className="flex-1 border-l border-[var(--border)] first:border-l-0">
                <AllDayChips items={items} dateKey={dateKey} />
              </div>
            )
          })}
        </div>
      )}
      <div ref={scrollRef} className="flex max-h-[65vh] overflow-y-auto">
        <HourGutter />
        {days.map((d) => {
          const dateKey = toDateKey(d)
          return (
            <div key={dateKey} className="flex-1 border-l border-[var(--border)] first:border-l-0">
              <HourGrid items={items} dateKey={dateKey} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
