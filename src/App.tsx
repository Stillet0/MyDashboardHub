import { useState } from 'react'
import TokenGate from './components/TokenGate'
import { clearToken } from './lib/githubStore'
import FinancesModule from './modules/finances/FinancesModule'
import AgendaModule from './modules/agenda/AgendaModule'
import TasksModule from './modules/tasks/TasksModule'

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

  return (
    <TokenGate>
      <div className="min-h-svh bg-[var(--bg)] text-[var(--text)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-display text-lg font-bold">
            Mon<span className="text-[var(--gold)]">Hub</span>
          </h1>
          <button
            onClick={() => {
              clearToken()
              window.location.reload()
            }}
            className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            Déconnexion
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-2 py-2">
          {MODULES.map((label) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`font-display shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
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
          {active === 'Finances' ? (
            <FinancesModule />
          ) : active === 'Agenda' ? (
            <AgendaModule />
          ) : active === 'Tâches' ? (
            <TasksModule />
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
