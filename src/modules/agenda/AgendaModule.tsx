import { useCallback, useEffect, useState } from 'react'
import { useAgendaData } from '../../lib/useAgendaData'
import { fmtEventDate, sortedEvents, toDateKey, type AgendaEvent } from '../../lib/agenda'
import { fetchUpcomingGoogleEvents, isConnected, type GoogleCalendarEvent } from '../../lib/googleCalendar'
import GoogleCalendarConnect from './GoogleCalendarConnect'
import { useTasksData } from '../../lib/useTasksData'
import { useCarData } from '../../lib/useCarData'
import { useDocumentsData } from '../../lib/useDocumentsData'
import { useGoalsData } from '../../lib/useGoalsData'
import { useHealthData } from '../../lib/useHealthData'
import { buildExternalAgendaItems, type ExternalAgendaModule } from '../../lib/agendaAggregate'
import { addDays, addMonths, type CalendarView as ViewMode } from '../../lib/calendarLayout'
import CalendarView, { type CalendarEventItem } from './CalendarView'

type Draft = { title: string; date: string; time: string; location: string; notes: string }

const emptyDraft = (date = toDateKey(new Date())): Draft => ({
  title: '',
  date,
  time: '',
  location: '',
  notes: '',
})

const VIEW_LABELS: Record<ViewMode, string> = { jour: 'Jour', semaine: 'Semaine', mois: 'Mois' }

const DAY_LABEL_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const MONTH_LABEL_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const SHORT_DAY_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function periodLabel(view: ViewMode, anchorDate: Date): string {
  if (view === 'jour') return capitalize(DAY_LABEL_FMT.format(anchorDate))
  if (view === 'mois') return capitalize(MONTH_LABEL_FMT.format(anchorDate))
  const day = anchorDate.getDay()
  const start = addDays(anchorDate, day === 0 ? -6 : 1 - day)
  const end = addDays(start, 6)
  return `${SHORT_DAY_FMT.format(start)} – ${SHORT_DAY_FMT.format(end)}`
}

type Props = { onNavigate?: (module: ExternalAgendaModule) => void }

export default function AgendaModule({ onNavigate }: Props) {
  const { data, loading, error, saving, save } = useAgendaData()
  const { data: tasks } = useTasksData()
  const { data: car } = useCarData()
  const { data: documents } = useDocumentsData()
  const { data: goals } = useGoalsData()
  const { data: health } = useHealthData()
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [view, setView] = useState<ViewMode>('semaine')
  const [anchorDate, setAnchorDate] = useState(new Date())

  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [formError, setFormError] = useState<string | null>(null)

  const loadGoogleEvents = useCallback(() => {
    if (!isConnected()) return
    setGoogleLoading(true)
    setGoogleError(null)
    fetchUpcomingGoogleEvents()
      .then(setGoogleEvents)
      .catch((e) => setGoogleError(e instanceof Error ? e.message : String(e)))
      .finally(() => setGoogleLoading(false))
  }, [])

  useEffect(() => {
    loadGoogleEvents()
  }, [loadGoogleEvents])

  function openAdd(date?: string) {
    setDraft(emptyDraft(date))
    setAddingOpen(true)
  }

  async function handleAdd() {
    if (!data) return
    if (!draft.title.trim() || !draft.date) {
      setFormError('Titre et date sont requis.')
      return
    }
    setFormError(null)
    const newEvent: AgendaEvent = {
      id: 'evt_' + Math.random().toString(36).slice(2, 10),
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time || undefined,
      location: draft.location.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    }
    await save({ events: [...data.events, newEvent] }, `Agenda: ajout de "${newEvent.title}"`)
    setDraft(emptyDraft())
    setAddingOpen(false)
  }

  function startEdit(e: AgendaEvent) {
    setEditingId(e.id)
    setEditDraft({
      title: e.title,
      date: e.date,
      time: e.time ?? '',
      location: e.location ?? '',
      notes: e.notes ?? '',
    })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.title.trim() || !editDraft.date) {
      setFormError('Titre et date sont requis.')
      return
    }
    setFormError(null)
    const nextEvents = data.events.map((e) =>
      e.id === id
        ? {
            ...e,
            title: editDraft.title.trim(),
            date: editDraft.date,
            time: editDraft.time || undefined,
            location: editDraft.location.trim() || undefined,
            notes: editDraft.notes.trim() || undefined,
          }
        : e,
    )
    await save({ events: nextEvents }, `Agenda: modification de "${editDraft.title}"`)
    setEditingId(null)
  }

  async function handleDeleteEditing() {
    if (!data || !editingId) return
    if (!window.confirm(`Supprimer "${editDraft.title}" ? Cette action est irréversible.`)) return
    await save(
      { events: data.events.filter((x) => x.id !== editingId) },
      `Agenda: suppression de "${editDraft.title}"`,
    )
    setEditingId(null)
  }

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const allExternalItems = buildExternalAgendaItems({
    tasks: tasks ?? undefined,
    car: car ?? undefined,
    documents: documents ?? undefined,
    goals: goals ?? undefined,
    health: health ?? undefined,
  })
  const overdueItems = allExternalItems
    .filter((e) => e.overdue)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  // La grille du calendrier affiche tout (passé et futur) pour permettre de naviguer librement,
  // contrairement au bandeau "En retard" ci-dessous qui reste un résumé volontairement limité
  // aux éléments encore non faits.
  const calendarItems: CalendarEventItem[] = [
    ...sortedEvents(data).map((e) => ({
      id: 'local_' + e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      subtitle: e.location,
      accent: 'var(--gold)',
      onClick: () => startEdit(e),
    })),
    ...googleEvents.map((e) => ({
      id: 'google_' + e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      subtitle: e.location,
      accent: '#6ea8fe',
    })),
    ...allExternalItems
      .filter((e): e is typeof e & { date: string } => !!e.date)
      .map((e) => ({
        id: 'ext_' + e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        subtitle: e.detail,
        accent: e.overdue ? 'var(--red)' : '#8B93A1',
        onClick: () => onNavigate?.(e.module),
      })),
  ]

  function goToday() {
    setAnchorDate(new Date())
  }
  function goPrev() {
    setAnchorDate((d) => (view === 'jour' ? addDays(d, -1) : view === 'semaine' ? addDays(d, -7) : addMonths(d, -1)))
  }
  function goNext() {
    setAnchorDate((d) => (view === 'jour' ? addDays(d, 1) : view === 'semaine' ? addDays(d, 7) : addMonths(d, 1)))
  }

  return (
    <div>
      <GoogleCalendarConnect onConnected={loadGoogleEvents} />

      {googleLoading && <p className="mb-3 text-xs text-[var(--text-faint)]">Chargement de Google Calendar…</p>}
      {googleError && <p className="mb-3 text-sm text-[var(--red)]">{googleError}</p>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-normal">Agenda</h2>
        <button
          onClick={() => openAdd(toDateKey(anchorDate))}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ‹
          </button>
          <button
            onClick={goToday}
            className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Aujourd'hui
          </button>
          <button
            onClick={goNext}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ›
          </button>
          <span className="font-display ml-1 text-sm font-semibold">{periodLabel(view, anchorDate)}</span>
        </div>
        <div className="flex gap-1">
          {(['jour', 'semaine', 'mois'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`font-display rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingOpen && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Titre"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Lieu (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Notes (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
            <button
              onClick={() => setAddingOpen(false)}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mb-4 rounded-[20px] border border-[var(--gold)]/40 bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={editDraft.title}
              onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={editDraft.date}
              onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              type="time"
              value={editDraft.time}
              onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={editDraft.location}
              onChange={(e) => setEditDraft({ ...editDraft, location: e.target.value })}
              placeholder="Lieu"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleEditSave(editingId)}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={handleDeleteEditing}
              className="font-display rounded-full border border-[var(--red)]/50 px-4 py-2 text-sm font-semibold text-[var(--red)]"
            >
              Supprimer
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {overdueItems.length > 0 && (
        <div className="mb-4 rounded-[20px] border border-[var(--red)]/40 bg-[rgba(236,111,111,0.08)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--red)]">En retard ({overdueItems.length})</div>
          <div className="divide-y divide-[var(--red)]/20">
            {overdueItems.map((e) => (
              <button
                key={e.id}
                onClick={() => onNavigate?.(e.module)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {e.title}
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      {e.module}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--red)]">
                    {[e.date ? fmtEventDate(e.date) : null, e.detail].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <CalendarView
        view={view}
        anchorDate={anchorDate}
        items={calendarItems}
        onSelectDay={(d) => {
          setAnchorDate(d)
          setView('jour')
        }}
      />
    </div>
  )
}
