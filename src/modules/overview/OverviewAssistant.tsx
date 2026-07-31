import type { TasksData } from '../../lib/tasks'
import type { AgendaData } from '../../lib/agenda'
import type { HabitsData } from '../../lib/habits'
import type { CarData } from '../../lib/car'
import type { DocumentsData } from '../../lib/documents'
import type { HealthData } from '../../lib/health'
import type { GoalsData } from '../../lib/goals'
import type { TravelData } from '../../lib/travel'
import type { FinancesData } from '../../lib/finances'
import type { NotesData } from '../../lib/notes'
import type { ContactsData } from '../../lib/contacts'
import { buildDataDigest } from '../../lib/dataDigest'
import { type Reminder, type Urgency } from '../../lib/reminders'
import AiSuggestPanel from '../../components/AiSuggestPanel'
import AiAssistant from '../../components/AiAssistant'
import QuickAdd from '../../components/QuickAdd'

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  soon: 'Bientôt',
}

type Props = {
  reminders: Reminder[]
  tasks: TasksData | null
  saveTasks: (next: TasksData, message: string) => Promise<void>
  agenda: AgendaData | null
  saveAgenda: (next: AgendaData, message: string) => Promise<void>
  health: HealthData | null
  saveHealth: (next: HealthData, message: string) => Promise<void>
  goals: GoalsData | null
  saveGoals: (next: GoalsData, message: string) => Promise<void>
  documents: DocumentsData | null
  saveDocuments: (next: DocumentsData, message: string) => Promise<void>
  habits: HabitsData | null
  car: CarData | null
  finances: FinancesData | null
  travel: TravelData | null
  notes: NotesData | null
  contacts: ContactsData | null
}

export default function OverviewAssistant({
  reminders,
  tasks,
  saveTasks,
  agenda,
  saveAgenda,
  health,
  saveHealth,
  goals,
  saveGoals,
  documents,
  saveDocuments,
  habits,
  car,
  finances,
  travel,
  notes,
  contacts,
}: Props) {
  const remindersContext =
    reminders.length > 0
      ? reminders
          .map((r) => `- [${URGENCY_LABEL[r.urgency]}] ${r.title}${r.detail ? ` (${r.detail})` : ''} — ${r.module}`)
          .join('\n')
      : 'Aucune échéance urgente pour le moment.'

  const dataDigest = buildDataDigest({
    tasks,
    agenda,
    habits,
    car,
    documents,
    health,
    goals,
    travel,
    finances,
    notes,
    contacts,
  })

  return (
    <div>
      <div className="mb-4">
        <AiSuggestPanel
          label="Plan de la journée"
          system="Tu es un assistant de productivité. Réponds en français en 5 phrases maximum ou une courte liste priorisée, de façon concrète et actionnable, sans salutation ni blabla."
          prompt={`Voici mes échéances et tâches en cours :\n${remindersContext}\nPropose-moi ce qu'il faut prioriser aujourd'hui et dans quel ordre.`}
          mode="text"
        />
      </div>

      <div className="mb-4">
        <AiAssistant digest={dataDigest} />
      </div>

      <div>
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
    </div>
  )
}
