import TokenGate from './components/TokenGate'
import { clearToken } from './lib/githubStore'

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

function App() {
  return (
    <TokenGate>
      <div className="min-h-svh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h1 className="text-lg font-semibold">MonHub</h1>
          <button
            onClick={() => {
              clearToken()
              window.location.reload()
            }}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Déconnexion
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-2 py-2 dark:border-neutral-800">
          {MODULES.map((label, i) => (
            <button
              key={label}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                i === 0
                  ? 'bg-violet-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="p-6">
          <h2 className="text-2xl font-semibold">Hello MonHub 👋</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Le squelette est en place. Les modules seront ajoutés un par un.
          </p>
        </main>
      </div>
    </TokenGate>
  )
}

export default App
