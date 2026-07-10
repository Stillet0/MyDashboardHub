import { useState } from 'react'
import {
  categoryColor,
  snapshotByCategory,
  snapshotTotal,
  sortedSnapshots,
  type FinancesData,
} from '../../lib/finances'

type Props = {
  data: FinancesData
  saving: boolean
  onSave: (next: FinancesData, message: string) => Promise<void>
}

export default function FinancesGoals({ data, saving, onSave }: Props) {
  const [goalAmount, setGoalAmount] = useState(data.goal ? String(data.goal.targetAmount) : '')
  const [goalDate, setGoalDate] = useState(data.goal?.targetDate ?? '')
  const [budgets, setBudgets] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    data.expenseCategories.forEach((c) => {
      init[c.name] = data.expenseBudgets[c.name] !== undefined ? String(data.expenseBudgets[c.name]) : ''
    })
    return init
  })
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    data.categories.forEach((c) => {
      init[c.name] = data.targetAllocation[c.name] !== undefined ? String(data.targetAllocation[c.name]) : ''
    })
    return init
  })
  const [benchmarkName, setBenchmarkName] = useState(data.benchmarkName)
  const [benchmarkReturn, setBenchmarkReturn] = useState(String(data.benchmarkAvgMonthlyReturn))
  const [error, setError] = useState<string | null>(null)

  async function handleSaveGoal() {
    setError(null)
    if (goalAmount.trim() === '') {
      await onSave({ ...data, goal: null }, 'Finances: objectif effacé')
      return
    }
    const amount = Number(goalAmount.replace(',', '.'))
    if (Number.isNaN(amount)) {
      setError('Montant cible invalide.')
      return
    }
    await onSave(
      { ...data, goal: { targetAmount: amount, targetDate: goalDate || null } },
      'Finances: objectif mis à jour',
    )
  }

  async function handleClearGoal() {
    setGoalAmount('')
    setGoalDate('')
    await onSave({ ...data, goal: null }, 'Finances: objectif effacé')
  }

  async function handleSaveBudgets() {
    setError(null)
    const next: Record<string, number> = {}
    for (const c of data.expenseCategories) {
      const raw = budgets[c.name] ?? ''
      if (raw === '' || Number(raw) === 0) continue
      const v = Number(raw.replace(',', '.'))
      if (Number.isNaN(v)) {
        setError(`Budget invalide pour "${c.name}".`)
        return
      }
      next[c.name] = v
    }
    await onSave({ ...data, expenseBudgets: next }, 'Finances: budgets mis à jour')
  }

  async function handleSaveAllocation() {
    setError(null)
    const next: Record<string, number> = {}
    for (const c of data.categories) {
      const raw = allocations[c.name] ?? ''
      if (raw === '' || Number(raw) === 0) continue
      const v = Number(raw.replace(',', '.'))
      if (Number.isNaN(v)) {
        setError(`Allocation cible invalide pour "${c.name}".`)
        return
      }
      next[c.name] = v
    }
    await onSave({ ...data, targetAllocation: next }, 'Finances: allocation cible mise à jour')
  }

  async function handleSaveBenchmark() {
    setError(null)
    const v = Number(benchmarkReturn.replace(',', '.'))
    if (Number.isNaN(v)) {
      setError('Rendement moyen invalide.')
      return
    }
    await onSave(
      { ...data, benchmarkName: benchmarkName.trim() || 'Indice', benchmarkAvgMonthlyReturn: v },
      'Finances: indice de référence mis à jour',
    )
  }

  const targetSum = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0)

  const snaps = sortedSnapshots(data)
  const lastSnap = snaps.length ? snaps[snaps.length - 1] : null
  const byCat = lastSnap ? snapshotByCategory(data, lastSnap) : {}
  const totalGross = lastSnap ? snapshotTotal(lastSnap) : 0

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-normal">Objectifs & Budget</h2>

      {error && <p className="text-sm text-[var(--red)]">{error}</p>}

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Objectif de patrimoine net</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Montant cible (€)
            </label>
            <input
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="Ex : 100000"
              inputMode="decimal"
              className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Échéance visée (optionnel)
            </label>
            <input
              type="month"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSaveGoal}
            disabled={saving}
            className="font-display flex-1 rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer l’objectif'}
          </button>
          {data.goal && (
            <button
              onClick={handleClearGoal}
              disabled={saving}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold"
            >
              Effacer
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          L'app projette une date d'atteinte à partir de votre rythme d'épargne moyen des derniers mois —
          visible sur l'Aperçu.
        </p>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Budgets mensuels par catégorie</div>
        <div className="divide-y divide-[var(--border)]">
          {data.expenseCategories.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </span>
              <input
                value={budgets[c.name] ?? ''}
                onChange={(e) => setBudgets({ ...budgets, [c.name]: e.target.value })}
                placeholder="0"
                inputMode="decimal"
                className="w-[120px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveBudgets}
          disabled={saving}
          className="font-display mt-3 w-full rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les budgets'}
        </button>
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          Laissez vide les catégories sans budget. La comparaison budget vs réalisé apparaît dans "Mise à
          jour".
        </p>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Allocation cible du patrimoine</div>
        <div className="divide-y divide-[var(--border)]">
          {data.categories.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  value={allocations[c.name] ?? ''}
                  onChange={(e) => setAllocations({ ...allocations, [c.name]: e.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-[80px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
                />
                <span className="text-sm text-[var(--text-muted)]">%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--text-faint)]">
          Total actuel des cibles :{' '}
          <strong className={Math.abs(targetSum - 100) < 0.5 ? 'text-[var(--emerald)]' : 'text-[var(--gold)]'}>
            {targetSum.toFixed(0)}%
          </strong>
          {Math.abs(targetSum - 100) >= 0.5 ? ' (idéalement 100%)' : ''}
        </p>
        <button
          onClick={handleSaveAllocation}
          disabled={saving}
          className="font-display mt-3 w-full rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer l’allocation cible'}
        </button>

        {totalGross > 0 && Object.keys(data.targetAllocation).length > 0 && (
          <div className="mt-4 space-y-3.5 border-t border-[var(--border)] pt-4">
            {data.categories.map((c) => {
              const target = data.targetAllocation[c.name]
              if (target === undefined) return null
              const actualVal = byCat[c.name] || 0
              const actualPct = totalGross > 0 ? (actualVal / totalGross) * 100 : 0
              const diff = actualPct - target
              const diffLabel = Math.abs(diff) < 0.5 ? 'pile' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt`
              const diffColor =
                Math.abs(diff) < 2
                  ? 'text-[var(--text-muted)]'
                  : diff > 0
                    ? 'text-[var(--red)]'
                    : 'text-[var(--emerald)]'
              const color = categoryColor(data, c.name)
              return (
                <div key={c.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      {c.name}
                    </span>
                    <span className="font-display text-[var(--text-muted)]">
                      {actualPct.toFixed(1)}% <span className="text-[var(--text-faint)]">/ cible {target}%</span>{' '}
                      · <span className={diffColor}>{diffLabel}</span>
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, actualPct)}%`, background: color }}
                    />
                    <div
                      className="absolute top-[-2px] h-3 w-0.5 bg-[var(--text)]"
                      style={{ left: `${Math.min(100, target)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-[var(--text-faint)]">
              Le trait vertical marque votre cible ; la barre colorée est votre allocation réelle actuelle.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Indice de référence</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Nom de l'indice
            </label>
            <input
              value={benchmarkName}
              onChange={(e) => setBenchmarkName(e.target.value)}
              placeholder="Ex : MSCI World"
              className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Rendement mensuel moyen (%)
            </label>
            <input
              value={benchmarkReturn}
              onChange={(e) => setBenchmarkReturn(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>
        <button
          onClick={handleSaveBenchmark}
          disabled={saving}
          className="font-display mt-3 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          Une seule valeur, appliquée comme repère — pas de connexion à une API ni de données en temps réel.
        </p>
      </div>
    </div>
  )
}
