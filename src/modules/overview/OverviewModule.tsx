import { useEffect, useState } from 'react'
import { useTasksData } from '../../lib/useTasksData'
import { useCarData } from '../../lib/useCarData'
import { useDocumentsData } from '../../lib/useDocumentsData'
import { useGoalsData } from '../../lib/useGoalsData'
import { useAgendaData } from '../../lib/useAgendaData'
import { useHabitsData } from '../../lib/useHabitsData'
import { useFinancesData } from '../../lib/useFinancesData'
import { useTravelData } from '../../lib/useTravelData'
import { useHealthData } from '../../lib/useHealthData'
import { useNotesData } from '../../lib/useNotesData'
import { useContactsData } from '../../lib/useContactsData'
import { fetchUpcomingGoogleEvents, isConnected as isGoogleConnected } from '../../lib/googleCalendar'
import { buildReminders } from '../../lib/reminders'
import { getPermission, notifyNewReminders, requestPermission } from '../../lib/notifications'
import type { AgendaEvent } from '../../lib/agenda'
import { useSyncManager } from '../../lib/useSyncManager'
import OverviewSummary from './OverviewSummary'
import OverviewReminders from './OverviewReminders'
import OverviewAssistant from './OverviewAssistant'

const RECHECK_INTERVAL = 30 * 60 * 1000

type ModuleLink =
  | 'Finances'
  | 'Agenda'
  | 'Tâches'
  | 'Habitudes'
  | 'Voiture'
  | 'Documents'
  | 'Santé'
  | 'Objectifs'
  | 'Voyages'
  | 'Notes'
  | 'Contacts'
type Props = { onNavigate: (module: ModuleLink) => void }

const TABS = ['Résumé', 'Rappels', 'Assistant'] as const
type Tab = (typeof TABS)[number]

export default function OverviewModule({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('Résumé')
  const { data: tasks, save: saveTasks } = useTasksData()
  const { data: car } = useCarData()
  const { data: documents, save: saveDocuments } = useDocumentsData()
  const { data: goals, save: saveGoals } = useGoalsData()
  const { data: agenda, save: saveAgenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const { data: finances } = useFinancesData()
  const { data: travel } = useTravelData()
  const { data: health, save: saveHealth } = useHealthData()
  const { data: notes } = useNotesData()
  const { data: contacts } = useContactsData()
  const { error: syncError, syncNow, conflict, resolveConflictKeepLocal, resolveConflictDiscardLocal } =
    useSyncManager()
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
    health: health ?? undefined,
    travel: travel ?? undefined,
    contacts: contacts ?? undefined,
    notes: notes ?? undefined,
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

  return (
    <div>
      {conflict ? (
        <div className="mb-4 rounded-[20px] border border-[var(--red)]/40 bg-[rgba(236,111,111,0.08)] px-5 py-3">
          <div className="text-sm text-[var(--red)]">
            ⚠ Conflit sur « {conflict.label} » : une autre version a été enregistrée depuis un autre appareil. Choisis
            quelle version garder.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => resolveConflictKeepLocal(conflict.path)}
              className="font-display shrink-0 rounded-full border border-[var(--red)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--red)]"
            >
              Garder ma version
            </button>
            <button
              onClick={() => resolveConflictDiscardLocal(conflict.path)}
              className="font-display shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]"
            >
              Utiliser la version à jour
            </button>
          </div>
        </div>
      ) : (
        syncError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] border border-[var(--red)]/40 bg-[rgba(236,111,111,0.08)] px-5 py-3">
            <span className="text-sm text-[var(--red)]">⚠ Échec de synchronisation : {syncError}</span>
            <button
              onClick={syncNow}
              className="font-display shrink-0 rounded-full border border-[var(--red)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--red)]"
            >
              Réessayer
            </button>
          </div>
        )
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-normal">Aperçu</h2>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-display rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {t}
              {t === 'Rappels' && reminders.length > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] text-[#1a1408]"
                  style={{ background: reminders.some((r) => r.urgency === 'overdue') ? 'var(--red)' : 'var(--gold)' }}
                >
                  {reminders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Résumé' ? (
        <OverviewSummary
          onNavigate={onNavigate}
          tasks={tasks}
          goals={goals}
          agenda={agenda}
          googleEvents={googleEvents}
          habits={habits}
          finances={finances}
          travel={travel}
          notes={notes}
          contacts={contacts}
          reminders={reminders}
        />
      ) : tab === 'Rappels' ? (
        <OverviewReminders
          reminders={reminders}
          onNavigate={onNavigate}
          permission={permission}
          onEnableNotifications={handleEnableNotifications}
        />
      ) : (
        <OverviewAssistant
          reminders={reminders}
          tasks={tasks}
          saveTasks={saveTasks}
          agenda={agenda}
          saveAgenda={saveAgenda}
          health={health}
          saveHealth={saveHealth}
          goals={goals}
          saveGoals={saveGoals}
          documents={documents}
          saveDocuments={saveDocuments}
          habits={habits}
          car={car}
          finances={finances}
          travel={travel}
          notes={notes}
          contacts={contacts}
        />
      )}
    </div>
  )
}
