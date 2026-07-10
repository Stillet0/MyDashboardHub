import { useState } from 'react'
import { useFinancesData } from '../../lib/useFinancesData'
import FinancesOverview from './FinancesOverview'
import FinancesAccounts from './FinancesAccounts'
import FinancesUpdate from './FinancesUpdate'
import FinancesDebts from './FinancesDebts'

const TABS = ['Aperçu', 'Mise à jour', 'Comptes', 'Dettes'] as const
type Tab = (typeof TABS)[number]

export default function FinancesModule() {
  const [tab, setTab] = useState<Tab>('Aperçu')
  const { data, loading, error, saving, save } = useFinancesData()

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-display rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-[var(--surface-2)] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--red)]">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
          Chargement…
        </div>
      ) : tab === 'Aperçu' ? (
        <FinancesOverview data={data} />
      ) : tab === 'Mise à jour' ? (
        <FinancesUpdate data={data} saving={saving} onSave={save} />
      ) : tab === 'Comptes' ? (
        <FinancesAccounts data={data} saving={saving} onSave={save} />
      ) : (
        <FinancesDebts data={data} saving={saving} onSave={save} />
      )}
    </div>
  )
}
