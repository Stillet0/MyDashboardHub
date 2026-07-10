import { useCallback, useEffect, useState } from 'react'
import { useAgendaData } from '../../lib/useAgendaData'
import { fmtEventDate, isToday, toDateKey, upcomingEvents, type AgendaEvent } from '../../lib/agenda'
import { fetchUpcomingGoogleEvents, isConnected, type GoogleCalendarEvent } from '../../lib/googleCalendar'
import GoogleCalendarConnect from './GoogleCalendarConnect'

type Draft = { title: string; date: string; time: string; location: string; notes: string }

const emptyDraft = (): Draft => ({
  title: '',
  date: toDateKey(new Date()),
  time: '',
  location: '',
  notes: '',
})

export default function AgendaModule() {
  const { data, loading, error, saving, save } = useAgendaData()
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleDelete(e: AgendaEvent) {
    if (!data) return
    if (!window.confirm(`Supprimer "${e.title}" ? Cette action est irréversible.`)) return
    await save({ events: data.events.filter((x) => x.id !== e.id) }, `Agenda: suppression de "${e.title}"`)
  }

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const localUpcoming = upcomingEvents(data).map((e) => ({ ...e, source: 'local' as const }))
  const merged = [
    ...localUpcoming,
    ...googleEvents.map((e) => ({ ...e, source: 'google' as const, notes: undefined })),
  ].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return (a.time ?? '').localeCompare(b.time ?? '')
  })

  const grouped = new Map<string, typeof merged>()
  merged.forEach((e) => {
    const list = grouped.get(e.date) ?? []
    list.push(e)
    grouped.set(e.date, list)
  })

  return (
    <div>
      <GoogleCalendarConnect onConnected={loadGoogleEvents} />

      {googleLoading && <p className="mb-3 text-xs text-[var(--text-faint)]">Chargement de Google Calendar…</p>}
      {googleError && <p className="mb-3 text-sm text-[var(--red)]">{googleError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">À venir</h2>
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
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

      {merged.length === 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Rien à venir</h3>
          <p>Ajoute un événement pour commencer.</p>
        </div>
      )}

      <div className="space-y-4">
        {[...grouped.entries()].map(([date, events]) => (
          <div key={date} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">
              {fmtEventDate(date)}
              {isToday(date) && <span className="ml-2 text-[var(--gold)]">· Aujourd'hui</span>}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {events.map((e) =>
                e.source === 'local' && editingId === e.id ? (
                  <div key={e.id} className="py-3.5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={editDraft.title}
                        onChange={(ev) => setEditDraft({ ...editDraft, title: ev.target.value })}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
                      />
                      <input
                        type="date"
                        value={editDraft.date}
                        onChange={(ev) => setEditDraft({ ...editDraft, date: ev.target.value })}
                        style={{ colorScheme: 'dark' }}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        type="time"
                        value={editDraft.time}
                        onChange={(ev) => setEditDraft({ ...editDraft, time: ev.target.value })}
                        style={{ colorScheme: 'dark' }}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={editDraft.location}
                        onChange={(ev) => setEditDraft({ ...editDraft, location: ev.target.value })}
                        placeholder="Lieu"
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleEditSave(e.id)}
                        disabled={saving}
                        className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                      >
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {e.time && (
                          <span className="font-display text-[var(--gold)]">{e.time}</span>
                        )}
                        {e.title}
                        {e.source === 'google' && (
                          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                            Google
                          </span>
                        )}
                      </div>
                      {e.location && (
                        <div className="text-xs text-[var(--text-muted)]">{e.location}</div>
                      )}
                    </div>
                    {e.source === 'local' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(e as AgendaEvent)}
                          title="Modifier"
                          className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(e as AgendaEvent)}
                          title="Supprimer"
                          className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
