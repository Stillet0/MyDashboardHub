import { useState } from 'react'
import TokenGate from './components/TokenGate'
import ErrorBoundary from './components/ErrorBoundary'
import Logo from './components/Logo'
import { clearToken } from './lib/githubStore'
import FinancesModule from './modules/finances/FinancesModule'
import AgendaModule from './modules/agenda/AgendaModule'
import TasksModule from './modules/tasks/TasksModule'
import HabitsModule from './modules/habits/HabitsModule'
import CarModule from './modules/car/CarModule'
import DocumentsModule from './modules/documents/DocumentsModule'
import HealthModule from './modules/health/HealthModule'
import GoalsModule from './modules/goals/GoalsModule'
import TravelModule from './modules/travel/TravelModule'
import NotesModule from './modules/notes/NotesModule'
import OverviewModule from './modules/overview/OverviewModule'
import AiSettings from './components/AiSettings'
import GlobalSearch from './components/GlobalSearch'
import { useSyncManager } from './lib/useSyncManager'

const MODULES = [
  'Aperçu',
  'Finances',
  'Agenda',
  'Tâches',
  'Habitudes',
  'Voiture',
  'Documents',
  'Santé',
  'Objectifs',
  'Voyages',
  'Notes',
] as const

type ModuleName = (typeof MODULES)[number]

function App() {
  const [active, setActive] = useState<ModuleName>('Aperçu')
  const { pending, syncing, error: syncError, conflict, syncNow } = useSyncManager()

  return (
    <TokenGate>
      <div className="min-h-svh bg-[var(--bg)] text-[var(--text)]">
        <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-display flex items-center gap-2 text-lg font-bold">
            <Logo size={26} />
            Mon<span className="text-[var(--gold)]">Hub</span>
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <GlobalSearch onNavigate={(m) => setActive(m)} />
            {syncing ? (
              <span className="text-xs whitespace-nowrap text-[var(--text-faint)]">Synchronisation…</span>
            ) : conflict ? (
              <button
                onClick={() => setActive('Aperçu')}
                className="text-xs whitespace-nowrap text-[var(--red)] hover:underline"
                title={`Conflit sur ${conflict.label} — résous-le depuis l'Aperçu`}
              >
                ⚠ Conflit sur {conflict.label}
              </button>
            ) : pending && syncError ? (
              <button
                onClick={syncNow}
                className="text-xs whitespace-nowrap text-[var(--red)] hover:underline"
                title={syncError}
              >
                ⚠ Échec de synchro — réessayer
              </button>
            ) : pending ? (
              <button
                onClick={syncNow}
                className="text-xs whitespace-nowrap text-[var(--gold)] hover:underline"
                title="Des modifications sont en attente d'envoi vers monhub-data"
              >
                ● Non synchronisé — synchroniser
              </button>
            ) : (
              <span className="text-xs whitespace-nowrap text-[var(--text-faint)]">✓ Synchronisé</span>
            )}
            <AiSettings />
            <button
              onClick={() => {
                clearToken()
                window.location.reload()
              }}
              className="text-xs whitespace-nowrap text-[var(--text-faint)] hover:text-[var(--text)]"
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
          <ErrorBoundary key={active}>
            {active === 'Aperçu' ? (
              <OverviewModule onNavigate={(m) => setActive(m)} />
            ) : active === 'Finances' ? (
              <FinancesModule />
            ) : active === 'Agenda' ? (
              <AgendaModule onNavigate={(m) => setActive(m)} />
            ) : active === 'Tâches' ? (
              <TasksModule />
            ) : active === 'Habitudes' ? (
              <HabitsModule />
            ) : active === 'Voiture' ? (
              <CarModule />
            ) : active === 'Documents' ? (
              <DocumentsModule />
            ) : active === 'Santé' ? (
              <HealthModule />
            ) : active === 'Objectifs' ? (
              <GoalsModule />
            ) : active === 'Voyages' ? (
              <TravelModule />
            ) : active === 'Notes' ? (
              <NotesModule />
            ) : (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
                Module « {active} » à venir.
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </TokenGate>
  )
}

export default App
