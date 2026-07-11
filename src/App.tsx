import { useState } from 'react'
import TokenGate from './components/TokenGate'
import { clearToken } from './lib/githubStore'
import FinancesModule from './modules/finances/FinancesModule'
import AgendaModule from './modules/agenda/AgendaModule'
import TasksModule from './modules/tasks/TasksModule'
import HabitsModule from './modules/habits/HabitsModule'
import CarModule from './modules/car/CarModule'
import DocumentsModule from './modules/documents/DocumentsModule'
import GoalsModule from './modules/goals/GoalsModule'
import TravelModule from './modules/travel/TravelModule'
import OverviewModule from './modules/overview/OverviewModule'
import AiSettings from './components/AiSettings'
import { useSyncManager } from './lib/useSyncManager'

const MODULES = [
  'Aujourd’hui',
  'Finances',
  'Agenda',
  'Tâches',
  'Habitudes',
  'Voiture',
  'Documents',
  'Objectifs',
  'Voyages',
] as const

type ModuleName = (typeof MODULES)[number]

function App() {
  const [active, setActive] = useState<ModuleName>('Finances')
  const { pending, syncing, syncNow } = useSyncManager()

  return (
    <TokenGate>
      <div className="min-h-svh bg-[var(--bg)] text-[var(--text)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-display text-lg font-bold">
            Mon<span className="text-[var(--gold)]">Hub</span>
          </h1>
          <div className="flex items-center gap-3">
            {syncing ? (
              <span className="text-xs text-[var(--text-faint)]">Synchronisation…</span>
            ) : pending ? (
              <button
                onClick={syncNow}
                className="text-xs text-[var(--gold)] hover:underline"
                title="Des modifications sont en attente d'envoi vers monhub-data"
              >
                ● Non synchronisé — synchroniser
              </button>
            ) : (
              <span className="text-xs text-[var(--text-faint)]">✓ Synchronisé</span>
            )}
            <AiSettings />
            <button
              onClick={() => {
                clearToken()
                window.location.reload()
              }}
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              Déconnexion
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-1 border-b border-[var(--border)] px-2 py-2">
          {MODULES.map((label) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`font-display rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === label
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="mx-auto max-w-[880px] p-5 pb-20">
          {active === 'Aujourd’hui' ? (
            <OverviewModule onNavigate={(m) => setActive(m)} />
          ) : active === 'Finances' ? (
            <FinancesModule />
          ) : active === 'Agenda' ? (
            <AgendaModule />
          ) : active === 'Tâches' ? (
            <TasksModule />
          ) : active === 'Habitudes' ? (
            <HabitsModule />
          ) : active === 'Voiture' ? (
            <CarModule />
          ) : active === 'Documents' ? (
            <DocumentsModule />
          ) : active === 'Objectifs' ? (
            <GoalsModule />
          ) : active === 'Voyages' ? (
            <TravelModule />
          ) : (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
              Module « {active} » à venir.
            </div>
          )}
        </main>
      </div>
    </TokenGate>
  )
}

export default App
