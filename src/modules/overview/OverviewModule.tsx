import { useEffect, useState, type ReactNode } from 'react'
import { useTasksData } from '../../lib/useTasksData'
import { useCarData } from '../../lib/useCarData'
import { useDocumentsData } from '../../lib/useDocumentsData'
import { useGoalsData } from '../../lib/useGoalsData'
import { useAgendaData } from '../../lib/useAgendaData'
import { useHabitsData } from '../../lib/useHabitsData'
import { useFinancesData } from '../../lib/useFinancesData'
import { useTravelData } from '../../lib/useTravelData'
import { useHealthData } from '../../lib/useHealthData'
import { fetchUpcomingGoogleEvents, isConnected as isGoogleConnected } from '../../lib/googleCalendar'
import { buildReminders, type Reminder, type Urgency } from '../../lib/reminders'
import { getPermission, isNotificationSupported, notifyNewReminders, requestPermission } from '../../lib/notifications'
import { upcomingEvents, fmtEventDate, type AgendaEvent } from '../../lib/agenda'
import { sortedTasks, isOverdue as isTaskOverdue } from '../../lib/tasks'
import { sortedGoals } from '../../lib/goals'
import { isDoneThisPeriod } from '../../lib/habits'
import { sortedTrips, isPast as isTripPast, fmtDateRange } from '../../lib/travel'
import { sortedSnapshots, snapshotNetWorth, computeDelta, fmtMoney } from '../../lib/finances'
import AiSuggestPanel from '../../components/AiSuggestPanel'
import QuickAdd from '../../components/QuickAdd'

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
type Props = { onNavigate: (module: ModuleLink) => void }

function Tile({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--gold)]/40"
    >
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1.5">{children}</div>
    </button>
  )
}

export default function OverviewModule({ onNavigate }: Props) {
  const { data: tasks, save: saveTasks } = useTasksData()
  const { data: car } = useCarData()
  const { data: documents, save: saveDocuments } = useDocumentsData()
  const { data: goals, save: saveGoals } = useGoalsData()
  const { data: agenda, save: saveAgenda } = useAgendaData()
  const { data: habits } = useHabitsData()
  const { data: finances } = useFinancesData()
  const { data: travel } = useTravelData()
  const { data: health, save: saveHealth } = useHealthData()
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

  // Finances : patrimoine net actuel + variation depuis le mois précédent
  const snaps = finances ? sortedSnapshots(finances) : []
  const lastSnap = snaps[snaps.length - 1]
  const prevSnap = snaps.length > 1 ? snaps[snaps.length - 2] : null
  const netWorth = lastSnap ? snapshotNetWorth(lastSnap) : null
  const netWorthDelta = lastSnap ? computeDelta(netWorth!, prevSnap ? snapshotNetWorth(prevSnap) : null) : null

  // Agenda : prochain événement (local + Google), à partir d'aujourd'hui
  const nextEvent = agenda
    ? [...upcomingEvents(agenda), ...googleEvents].sort((a, b) => a.date.localeCompare(b.date))[0]
    : undefined

  // Tâches : tâches critiques = en retard, du jour, ou priorité haute
  const openTasks = tasks ? sortedTasks(tasks.tasks).filter((t) => !t.done) : []
  const criticalTasks = openTasks.filter(
    (t) => isTaskOverdue(t) || t.priority === 'haute' || (t.dueDate && t.dueDate === new Date().toISOString().slice(0, 10)),
  )

  // Objectifs : objectifs actifs, le plus proche en premier
  const activeGoals = goals ? sortedGoals(goals.goals).filter((g) => !g.done) : []
  const nextGoal = activeGoals[0]

  // Habitudes : complétion du jour/de la semaine selon la fréquence de chaque habitude
  const habitsList = habits?.habits ?? []
  const habitsDoneCount = habitsList.filter((h) => isDoneThisPeriod(h)).length

  // Voiture / Documents / Santé : prochaine échéance issue des rappels déjà calculés
  const nextCarReminder = reminders.find((r) => r.module === 'Voiture')
  const nextDocReminder = reminders.find((r) => r.module === 'Documents')
  const nextHealthReminder = reminders.find((r) => r.module === 'Santé')

  // Voyages : prochain voyage à venir
  const nextTrip = travel ? sortedTrips(travel.trips).find((t) => !isTripPast(t)) : undefined

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

      <div className="mb-4">
        <QuickAdd
          tasksData={tasks}
          saveTasks={saveTasks}
          agendaData={agenda}
          saveAgenda={saveAgenda}
          healthData={health}
          saveHealth={saveHealth}
          goalsData={goals}
          saveGoals={saveGoals}
          documentsData={documents}
          saveDocuments={saveDocuments}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tile label="Finances" onClick={() => onNavigate('Finances')}>
          {netWorth === null ? (
            <div className="text-sm text-[var(--text-muted)]">Aucune donnée</div>
          ) : (
            <>
              <div className="font-display text-lg font-semibold">{fmtMoney(netWorth)}</div>
              {netWorthDelta && netWorthDelta.diff !== null && (
                <div
                  className={`text-xs ${netWorthDelta.diff >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--red)]'}`}
                >
                  {netWorthDelta.diff >= 0 ? '+' : ''}
                  {fmtMoney(netWorthDelta.diff)} ce mois-ci
                </div>
              )}
            </>
          )}
        </Tile>

        <Tile label="Agenda" onClick={() => onNavigate('Agenda')}>
          {nextEvent ? (
            <>
              <div className="text-sm font-medium">{nextEvent.title}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {fmtEventDate(nextEvent.date)}
                {nextEvent.time ? ` à ${nextEvent.time}` : ''}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucun événement à venir</div>
          )}
        </Tile>

        <Tile label="Tâches" onClick={() => onNavigate('Tâches')}>
          {criticalTasks.length > 0 ? (
            <>
              <div className="text-sm font-medium">
                {criticalTasks.length} tâche{criticalTasks.length > 1 ? 's' : ''} critique
                {criticalTasks.length > 1 ? 's' : ''}
              </div>
              <div className="truncate text-xs text-[var(--text-muted)]">{criticalTasks[0].title}</div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucune tâche urgente</div>
          )}
        </Tile>

        <Tile label="Santé" onClick={() => onNavigate('Santé')}>
          {nextHealthReminder ? (
            <>
              <div className="text-sm font-medium">{nextHealthReminder.title}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {[nextHealthReminder.detail, URGENCY_LABEL[nextHealthReminder.urgency]].filter(Boolean).join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">RAS</div>
          )}
        </Tile>

        <Tile label="Objectifs" onClick={() => onNavigate('Objectifs')}>
          {nextGoal ? (
            <>
              <div className="text-sm font-medium">
                {activeGoals.length} objectif{activeGoals.length > 1 ? 's' : ''} en cours
              </div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {nextGoal.title} · {nextGoal.progress}%
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucun objectif en cours</div>
          )}
        </Tile>

        <Tile label="Habitudes" onClick={() => onNavigate('Habitudes')}>
          {habitsList.length > 0 ? (
            <div className="text-sm font-medium">
              {habitsDoneCount}/{habitsList.length} complétées
            </div>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucune habitude suivie</div>
          )}
        </Tile>

        <Tile label="Voiture" onClick={() => onNavigate('Voiture')}>
          {nextCarReminder ? (
            <>
              <div className="text-sm font-medium">{nextCarReminder.title}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {[nextCarReminder.detail, URGENCY_LABEL[nextCarReminder.urgency]].filter(Boolean).join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">RAS</div>
          )}
        </Tile>

        <Tile label="Documents" onClick={() => onNavigate('Documents')}>
          {nextDocReminder ? (
            <>
              <div className="text-sm font-medium">{nextDocReminder.title}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {[nextDocReminder.detail, URGENCY_LABEL[nextDocReminder.urgency]].filter(Boolean).join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">RAS</div>
          )}
        </Tile>

        <Tile label="Voyages" onClick={() => onNavigate('Voyages')}>
          {nextTrip ? (
            <>
              <div className="text-sm font-medium">{nextTrip.name}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {[nextTrip.destination, fmtDateRange(nextTrip.startDate, nextTrip.endDate)].filter(Boolean).join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucun voyage prévu</div>
          )}
        </Tile>
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
