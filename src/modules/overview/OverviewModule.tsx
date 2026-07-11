import { useEffect, useState } from 'react'
import { useTasksData } from '../../lib/useTasksData'
import { useCarData } from '../../lib/useCarData'
import { useDocumentsData } from '../../lib/useDocumentsData'
import { useGoalsData } from '../../lib/useGoalsData'
import { useAgendaData } from '../../lib/useAgendaData'
import { useHabitsData } from '../../lib/useHabitsData'
import { fetchUpcomingGoogleEvents, isConnected as isGoogleConnected } from '../../lib/googleCalendar'
import { buildReminders, type Reminder, type Urgency } from '../../lib/reminders'
import { getPermission, isNotificationSupported, notifyNewReminders, requestPermission } from '../../lib/notifications'
import type { AgendaEvent } from '../../lib/agenda'
import AiSuggestPanel from '../../components/AiSuggestPanel'

const RECHECK_INTERVAL = 30 * 60 * 1000

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  soon: 'Bientôt',
}

const URGENCY_COLOR: Record<Urgency, string> = {
  overdue: 'var(--red)',
  today: 'var(--gold)',
  soon: 'var(--text-muted)',
}

type Props = { onNavigate: (module: Reminder['module']) => void }

export default function OverviewModule({ onNavigate }: Props) {
  const { data: tasks } = useTasksData()
  const { data: car } = useCarData()
  const { data: documents } = useDocumentsData()
  const { data: goals } = useGoalsData()
  const { data: agenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const [googleEvents, setGoogleEvents] = useState<AgendaEvent[]>([])
  const [permission, setPermission] = useState(getPermission())

  useEffect(() => {
    if (!isGoogleConnected()) return
    fetchUpcomingGoogleEvents()
      .then((events) =>
        setGoogleEvents(
          events.map((e) => ({ id: e.id, title: e.title, date: e.date, time: e.time, source: 'google' })),
        ),
      )
      .catch(() => {})
  }, [])

  const reminders = buildReminders({
    tasks: tasks ?? undefined,
    car: car ?? undefined,
    documents: documents ?? undefined,
    goals: goals ?? undefined,
    agenda: agenda ?? undefined,
    googleEvents,
    habits: habits ?? undefined,
  })

  useEffect(() => {
    if (reminders.length === 0) return
    const actionable = reminders.filter((r) => r.urgency === 'overdue' || r.urgency === 'today')
    notifyNewReminders(actionable)
    const interval = setInterval(() => notifyNewReminders(actionable), RECHECK_INTERVAL)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(reminders.map((r) => r.id))])

  async function handleEnableNotifications() {
    const perm = await requestPermission()
    setPermission(perm)
  }

  const grouped: Record<Urgency, Reminder[]> = { overdue: [], today: [], soon: [] }
  reminders.forEach((r) => grouped[r.urgency].push(r))

  const remindersContext =
    reminders.length > 0
      ? reminders
          .map((r) => `- [${URGENCY_LABEL[r.urgency]}] ${r.title}${r.detail ? ` (${r.detail})` : ''} — ${r.module}`)
          .join('\n')
      : 'Aucune échéance urgente pour le moment.'

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-normal">Aperçu</h2>
        <div className="mt-2.5">
          <AiSuggestPanel
            label="Plan de la journée"
            system="Tu es un assistant de productivité. Réponds en français en 5 phrases maximum ou une courte liste priorisée, de façon concrète et actionnable, sans salutation ni blabla."
            prompt={`Voici mes échéances et tâches en cours :\n${remindersContext}\nPropose-moi ce qu'il faut prioriser aujourd'hui et dans quel ordre.`}
            mode="text"
          />
        </div>
      </div>

      {isNotificationSupported() && permission === 'default' && (
        <div className="mb-4 flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
          <span className="text-sm text-[var(--text-muted)]">
            Active les notifications pour être alerté des rappels en retard.
          </span>
          <button
            onClick={handleEnableNotifications}
            className="font-display shrink-0 rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408]"
          >
            Activer
          </button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Notifications bloquées dans les réglages du navigateur — les rappels restent visibles ici.
        </p>
      )}

      {reminders.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Rien à signaler</h3>
          <p>Aucune échéance, tâche ou événement urgent pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['overdue', 'today', 'soon'] as Urgency[]).map((urgency) =>
            grouped[urgency].length === 0 ? null : (
              <div key={urgency} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div
                  className="mb-3 text-sm font-medium"
                  style={{ color: URGENCY_COLOR[urgency] }}
                >
                  {URGENCY_LABEL[urgency]} ({grouped[urgency].length})
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {grouped[urgency].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onNavigate(r.module)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{r.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {[r.module, r.detail].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
