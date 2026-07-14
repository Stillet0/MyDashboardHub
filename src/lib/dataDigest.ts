import type { TasksData } from './tasks'
import type { AgendaData } from './agenda'
import type { HabitsData } from './habits'
import type { CarData } from './car'
import type { DocumentsData } from './documents'
import type { HealthData } from './health'
import type { GoalsData } from './goals'
import type { TravelData } from './travel'
import type { FinancesData } from './finances'
import { fmtMoney, sortedSnapshots, snapshotNetWorth } from './finances'

const MAX_ITEMS = 25

function bullets(lines: string[]): string {
  return lines.length > 0 ? lines.slice(0, MAX_ITEMS).join('\n') : '(rien)'
}

/**
 * Construit un résumé textuel compact de toutes les données de l'utilisateur, pour servir de
 * contexte à l'assistant conversationnel — il ne doit répondre qu'à partir de ce résumé, jamais
 * en inventant des données qu'il ne voit pas ici.
 */
export function buildDataDigest(input: {
  tasks?: TasksData | null
  agenda?: AgendaData | null
  habits?: HabitsData | null
  car?: CarData | null
  documents?: DocumentsData | null
  health?: HealthData | null
  goals?: GoalsData | null
  travel?: TravelData | null
  finances?: FinancesData | null
}): string {
  const todayKey = new Date().toISOString().slice(0, 10)
  const sections: string[] = [`Date d'aujourd'hui : ${todayKey}`]

  if (input.tasks) {
    const open = input.tasks.tasks.filter((t) => !t.done)
    sections.push(
      '## Tâches (non terminées)\n' +
        bullets(
          open.map(
            (t) =>
              `- ${t.title}${t.category ? ` [${t.category}]` : ''} (priorité ${t.priority}${t.dueDate ? `, échéance ${t.dueDate}` : ''}${t.recurrence ? ', récurrente' : ''})`,
          ),
        ),
    )
  }

  if (input.agenda) {
    const upcoming = [...input.agenda.events].filter((e) => e.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date))
    sections.push(
      '## Agenda (événements à venir)\n' +
        bullets(upcoming.map((e) => `- ${e.date}${e.time ? ` ${e.time}` : ''} : ${e.title}${e.location ? ` (${e.location})` : ''}`)),
    )
  }

  if (input.habits) {
    sections.push(
      '## Habitudes\n' +
        bullets(
          input.habits.habits.map(
            (h) => `- ${h.name} (${h.frequency}, ${h.doneDates.length} jours cochés au total)`,
          ),
        ),
    )
  }

  if (input.car) {
    const vehicleName = (id: string) => input.car!.vehicles.find((v) => v.id === id)?.name ?? '?'
    const openDeadlines = input.car.deadlines.filter((d) => !d.done)
    sections.push(
      '## Voiture\n' +
        bullets(input.car.vehicles.map((v) => `- Véhicule ${v.name} : ${v.currentMileage} km actuellement`)) +
        '\n### Échéances non faites\n' +
        bullets(
          openDeadlines.map(
            (d) =>
              `- ${d.label} (${vehicleName(d.vehicleId)})${d.dueDate ? `, date ${d.dueDate}` : ''}${d.dueMileage ? `, à ${d.dueMileage} km` : ''}`,
          ),
        ),
    )
  }

  if (input.documents) {
    const openDocs = input.documents.documents.filter((d) => !d.done)
    sections.push(
      '## Documents\n' +
        bullets(
          openDocs.map(
            (d) => `- ${d.name}${d.category ? ` [${d.category}]` : ''}${d.expirationDate ? `, expire le ${d.expirationDate}` : ''}`,
          ),
        ),
    )
  }

  if (input.health) {
    const openAppts = input.health.appointments.filter((a) => !a.done)
    sections.push(
      '## Santé\n' +
        bullets(openAppts.map((a) => `- Rendez-vous : ${a.title} le ${a.date}${a.practitioner ? ` (${a.practitioner})` : ''}`)) +
        '\n### Traitements en cours\n' +
        bullets(
          input.health.treatments
            .filter((t) => t.ongoing)
            .map((t) => `- ${t.name}${t.dosage ? ` (${t.dosage})` : ''}${t.renewalDate ? `, renouvellement ${t.renewalDate}` : ''}`),
        ),
    )
  }

  if (input.goals) {
    const openGoals = input.goals.goals.filter((g) => !g.done)
    sections.push(
      '## Objectifs en cours\n' +
        bullets(openGoals.map((g) => `- ${g.title} (${g.progress}%)${g.targetDate ? `, échéance ${g.targetDate}` : ''}`)),
    )
  }

  if (input.travel) {
    sections.push(
      '## Voyages\n' +
        bullets(
          input.travel.trips.map(
            (t) => `- ${t.name}${t.destination ? ` à ${t.destination}` : ''}${t.startDate ? `, du ${t.startDate}${t.endDate ? ` au ${t.endDate}` : ''}` : ''}`,
          ),
        ),
    )
  }

  if (input.finances) {
    const snaps = sortedSnapshots(input.finances)
    const last = snaps[snaps.length - 1]
    const netWorth = last ? snapshotNetWorth(last) : null
    sections.push(
      '## Finances\n' +
        (netWorth !== null ? `- Patrimoine net actuel : ${fmtMoney(netWorth)}\n` : '') +
        bullets(input.finances.accounts.map((a) => `- Compte ${a.name} [${a.category}] : ${fmtMoney(a.value)}`)) +
        (input.finances.debts.length > 0
          ? '\n### Dettes\n' + bullets(input.finances.debts.map((d) => `- ${d.name} [${d.category}] : ${fmtMoney(d.value)}`))
          : ''),
    )
  }

  return sections.join('\n\n')
}
