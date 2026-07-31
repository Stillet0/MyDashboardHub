import type { ReactNode } from 'react'
import type { TasksData } from '../../lib/tasks'
import { sortedTasks, isOverdue as isTaskOverdue } from '../../lib/tasks'
import type { GoalsData } from '../../lib/goals'
import { sortedGoals } from '../../lib/goals'
import type { AgendaData, AgendaEvent } from '../../lib/agenda'
import { upcomingEvents, fmtEventDate } from '../../lib/agenda'
import type { HabitsData } from '../../lib/habits'
import { isDoneThisPeriod } from '../../lib/habits'
import type { FinancesData } from '../../lib/finances'
import { sortedSnapshots, snapshotNetWorth, computeDelta, fmtMoney } from '../../lib/finances'
import type { TravelData } from '../../lib/travel'
import { sortedTrips, isPast as isTripPast, fmtDateRange } from '../../lib/travel'
import type { NotesData } from '../../lib/notes'
import { sortedNotes } from '../../lib/notes'
import type { ContactsData } from '../../lib/contacts'
import { nextBirthday, ageTurning, daysUntil as daysUntilContact } from '../../lib/contacts'
import { daysUntil, type Reminder, type Urgency } from '../../lib/reminders'

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  soon: 'Bientôt',
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
  | 'Notes'
  | 'Contacts'

type Props = {
  onNavigate: (module: ModuleLink) => void
  tasks: TasksData | null
  goals: GoalsData | null
  agenda: AgendaData | null
  googleEvents: AgendaEvent[]
  habits: HabitsData | null
  finances: FinancesData | null
  travel: TravelData | null
  notes: NotesData | null
  contacts: ContactsData | null
  reminders: Reminder[]
}

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

export default function OverviewSummary({
  onNavigate,
  tasks,
  goals,
  agenda,
  googleEvents,
  habits,
  finances,
  travel,
  notes,
  contacts,
  reminders,
}: Props) {
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

  // Notes : note la plus récente (épinglée en priorité)
  const latestNote = notes ? sortedNotes(notes.notes)[0] : undefined

  // Contacts : anniversaires dans les 7 prochains jours
  const upcomingBirthdays = (contacts?.contacts ?? [])
    .filter((c) => c.birthday)
    .map((c) => {
      const next = nextBirthday(c.birthday!)!
      return { contact: c, next, days: daysUntilContact(next), age: ageTurning(c.birthday!, next) }
    })
    .filter((b) => b.days <= 7)
    .sort((a, b) => a.days - b.days)
  const nextBirthdayEntry = upcomingBirthdays[0]

  // Bilan hebdomadaire : tâches à traiter dans les 7 prochains jours (échéance dépassée incluse)
  const tasksThisWeekCount = openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 7).length

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tile label="Finances" onClick={() => onNavigate('Finances')}>
          {netWorth === null ? (
            <div className="text-sm text-[var(--text-muted)]">Aucune donnée</div>
          ) : (
            <>
              <div className="font-display text-lg font-semibold">{fmtMoney(netWorth)}</div>
              {netWorthDelta && netWorthDelta.diff !== null && (
                <div className={`text-xs ${netWorthDelta.diff >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--red)]'}`}>
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

        <Tile label="Notes" onClick={() => onNavigate('Notes')}>
          {latestNote ? (
            <>
              <div className="text-sm font-medium">{latestNote.title}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {[latestNote.space, `${notes?.notes.length ?? 0} note${(notes?.notes.length ?? 0) > 1 ? 's' : ''}`]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucune note</div>
          )}
        </Tile>

        <Tile label="Contacts" onClick={() => onNavigate('Contacts')}>
          {nextBirthdayEntry ? (
            <>
              <div className="text-sm font-medium">🎂 {nextBirthdayEntry.contact.name}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                {nextBirthdayEntry.days === 0 ? "aujourd'hui" : `dans ${nextBirthdayEntry.days} j`}
                {nextBirthdayEntry.age ? ` · ${nextBirthdayEntry.age} ans` : ''}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--text-muted)]">Aucun anniversaire proche</div>
          )}
        </Tile>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Cette semaine</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="font-display text-lg font-semibold">{tasksThisWeekCount}</div>
            <div className="text-xs text-[var(--text-muted)]">tâche{tasksThisWeekCount > 1 ? 's' : ''} à traiter</div>
          </div>
          <div>
            <div className="font-display text-lg font-semibold">
              {habitsDoneCount}/{habitsList.length}
            </div>
            <div className="text-xs text-[var(--text-muted)]">habitudes aujourd'hui</div>
          </div>
          <div>
            <div className="font-display text-lg font-semibold">{reminders.length}</div>
            <div className="text-xs text-[var(--text-muted)]">échéance{reminders.length > 1 ? 's' : ''} à suivre</div>
          </div>
          <div>
            <div
              className={`font-display text-lg font-semibold ${
                netWorthDelta && netWorthDelta.diff !== null
                  ? netWorthDelta.diff >= 0
                    ? 'text-[var(--emerald)]'
                    : 'text-[var(--red)]'
                  : ''
              }`}
            >
              {netWorthDelta && netWorthDelta.diff !== null
                ? `${netWorthDelta.diff >= 0 ? '+' : ''}${fmtMoney(netWorthDelta.diff)}`
                : '—'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">patrimoine (dernier relevé)</div>
          </div>
        </div>
        {upcomingBirthdays.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3">
            {upcomingBirthdays.map(({ contact, days, age }) => (
              <button
                key={contact.id}
                onClick={() => onNavigate('Contacts')}
                className="flex w-full items-center justify-between gap-2 text-left text-xs"
              >
                <span className="text-[var(--text-muted)]">
                  🎂 {contact.name} {days === 0 ? "aujourd'hui" : `dans ${days} j`}
                  {age ? ` (${age} ans)` : ''}
                </span>
                <span className="text-[var(--gold)]">🎁 pense à un cadeau</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
