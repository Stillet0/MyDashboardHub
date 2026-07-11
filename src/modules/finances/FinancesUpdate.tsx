import { useEffect, useMemo, useState } from 'react'
import {
  cashflowForMonth,
  cashflowTotals,
  computeSuggestedMovement,
  currentMonthKey,
  findSnapshotByMonth,
  fmtMoney,
  fmtMonth,
  fmtMonthShort,
  getDebtPrefillValue,
  getLatestOverride,
  getPrefillValue,
  nextEntryMonth,
  parseSum,
  shiftMonth,
  type Cashflow,
  type FinancesData,
  type PerfOverride,
  type Snapshot,
} from '../../lib/finances'

type Props = {
  data: FinancesData
  saving: boolean
  onSave: (next: FinancesData, message: string) => Promise<void>
}

export default function FinancesUpdate({ data, saving, onSave }: Props) {
  const [month, setMonth] = useState(() => nextEntryMonth(data) || currentMonthKey())
  const [accountValues, setAccountValues] = useState<Record<string, string>>({})
  const [investedValues, setInvestedValues] = useState<Record<string, string>>({})
  const [gainValues, setGainValues] = useState<Record<string, string>>({})
  const [pctValues, setPctValues] = useState<Record<string, string>>({})
  const [movementValues, setMovementValues] = useState<Record<string, string>>({})
  const [debtValues, setDebtValues] = useState<Record<string, string>>({})
  const [incomeValues, setIncomeValues] = useState<Record<string, string>>({})
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const existingSnap = findSnapshotByMonth(data, month)
  const existingCf = cashflowForMonth(data, month)
  const hasAnyExisting = !!existingSnap || !!existingCf
  const totals = existingCf ? cashflowTotals(existingCf) : { income: 0, expenses: 0, net: 0 }

  useEffect(() => {
    const nextAccountValues: Record<string, string> = {}
    data.accounts.forEach((acc) => {
      const v = getPrefillValue(data, acc.id, month)
      nextAccountValues[acc.id] = v === '' ? '' : String(v)
    })
    setAccountValues(nextAccountValues)

    const nextInvested: Record<string, string> = {}
    const nextGain: Record<string, string> = {}
    const nextPct: Record<string, string> = {}
    const nextMovement: Record<string, string> = {}
    data.accounts.forEach((acc) => {
      const ov = existingSnap?.perfOverrides?.[acc.id]
      nextInvested[acc.id] = ov?.totalInvested !== undefined ? String(ov.totalInvested) : ''
      nextGain[acc.id] = ov?.gainEur !== undefined ? String(ov.gainEur) : ''
      nextPct[acc.id] = ov?.pct !== undefined ? String(ov.pct) : ''
      nextMovement[acc.id] =
        existingCf?.movements[acc.id] !== undefined ? String(existingCf.movements[acc.id]) : ''
    })
    setInvestedValues(nextInvested)
    setGainValues(nextGain)
    setPctValues(nextPct)
    setMovementValues(nextMovement)

    const nextDebtValues: Record<string, string> = {}
    data.debts.forEach((d) => {
      const v = getDebtPrefillValue(data, d.id, month)
      nextDebtValues[d.id] = v === '' ? '' : String(v)
    })
    setDebtValues(nextDebtValues)

    const cf = cashflowForMonth(data, month)
    const nextIncome: Record<string, string> = {}
    data.incomeCategories.forEach((c) => {
      nextIncome[c.name] = cf?.income[c.name] !== undefined ? String(cf.income[c.name]) : ''
    })
    setIncomeValues(nextIncome)

    const nextExpense: Record<string, string> = {}
    data.expenseCategories.forEach((c) => {
      nextExpense[c.name] = cf?.expenses[c.name] !== undefined ? String(cf.expenses[c.name]) : ''
    })
    setExpenseValues(nextExpense)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    month,
    data.accounts.length,
    data.debts.length,
    data.incomeCategories.length,
    data.expenseCategories.length,
  ])

  const canGoNext = useMemo(() => month < currentMonthKey(), [month])

  async function handleSave() {
    setError(null)
    const entries: Record<string, number> = {}
    for (const acc of data.accounts) {
      const raw = accountValues[acc.id] ?? ''
      if (raw === '') continue
      const v = parseSum(raw)
      if (Number.isNaN(v)) {
        setError(`Valeur invalide pour "${acc.name}".`)
        return
      }
      entries[acc.id] = v
    }

    const perfOverrides: Record<string, PerfOverride> = {}
    const movements: Record<string, number> = {}
    for (const acc of data.accounts) {
      const ov: PerfOverride = {}
      const investedRaw = investedValues[acc.id] ?? ''
      const gainRaw = gainValues[acc.id] ?? ''
      const pctRaw = pctValues[acc.id] ?? ''
      if (investedRaw !== '') {
        const v = Number(investedRaw.replace(',', '.'))
        if (Number.isNaN(v)) {
          setError(`Montant investi invalide pour "${acc.name}".`)
          return
        }
        ov.totalInvested = v
      }
      if (gainRaw !== '') {
        const v = Number(gainRaw.replace(',', '.'))
        if (Number.isNaN(v)) {
          setError(`Gain invalide pour "${acc.name}".`)
          return
        }
        ov.gainEur = v
      }
      if (pctRaw !== '') {
        const v = Number(pctRaw.replace(',', '.'))
        if (Number.isNaN(v)) {
          setError(`Pourcentage invalide pour "${acc.name}".`)
          return
        }
        ov.pct = v
      }
      if (Object.keys(ov).length > 0) perfOverrides[acc.id] = ov

      const movementRaw = movementValues[acc.id] ?? ''
      if (movementRaw !== '') {
        const v = Number(movementRaw.replace(',', '.'))
        if (Number.isNaN(v)) {
          setError(`Apport invalide pour "${acc.name}".`)
          return
        }
        movements[acc.id] = v
      } else {
        const suggested = computeSuggestedMovement(
          data,
          acc.id,
          month,
          investedRaw !== '' ? Number(investedRaw.replace(',', '.')) : undefined,
        )
        if (suggested !== null) movements[acc.id] = suggested
      }
    }

    const debtEntries: Record<string, number> = {}
    for (const d of data.debts) {
      const raw = debtValues[d.id] ?? ''
      if (raw === '') continue
      const v = parseSum(raw)
      if (Number.isNaN(v)) {
        setError(`Solde invalide pour "${d.name}".`)
        return
      }
      debtEntries[d.id] = v
    }

    const income: Record<string, number> = {}
    for (const c of data.incomeCategories) {
      const raw = incomeValues[c.name] ?? ''
      if (raw === '') continue
      const v = parseSum(raw)
      if (Number.isNaN(v)) {
        setError(`Montant invalide pour le revenu "${c.name}".`)
        return
      }
      income[c.name] = v
    }

    const expenses: Record<string, number> = {}
    for (const c of data.expenseCategories) {
      const raw = expenseValues[c.name] ?? ''
      if (raw === '') continue
      const v = parseSum(raw)
      if (Number.isNaN(v)) {
        setError(`Montant invalide pour la dépense "${c.name}".`)
        return
      }
      expenses[c.name] = v
    }

    const newSnapshot: Snapshot = {
      id: existingSnap?.id ?? 'snap_' + month,
      date: month,
      entries,
      ...(data.debts.length > 0 ? { debtEntries } : {}),
      ...(Object.keys(perfOverrides).length > 0 ? { perfOverrides } : {}),
    }
    const newCashflow: Cashflow = {
      id: existingCf?.id ?? 'cf_' + month,
      date: month,
      income,
      expenses,
      movements,
    }

    const nextSnapshots = existingSnap
      ? data.snapshots.map((s) => (s.date === month ? newSnapshot : s))
      : [...data.snapshots, newSnapshot]
    const nextCashflows = existingCf
      ? data.cashflows.map((c) => (c.date === month ? newCashflow : c))
      : [...data.cashflows, newCashflow]

    await onSave(
      { ...data, snapshots: nextSnapshots, cashflows: nextCashflows },
      `Finances: relevé de ${fmtMonth(month)}`,
    )
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer les données de ${fmtMonth(month)} ? Cette action est irréversible.`))
      return
    await onSave(
      {
        ...data,
        snapshots: data.snapshots.filter((s) => s.date !== month),
        cashflows: data.cashflows.filter((c) => c.date !== month),
      },
      `Finances: suppression du relevé de ${fmtMonth(month)}`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Mois</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)]"
          >
            ←
          </button>
          <input
            type="month"
            value={month}
            max={currentMonthKey()}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="flex-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            style={{ colorScheme: 'dark' }}
          />
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={!canGoNext}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] disabled:opacity-30"
          >
            →
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          {hasAnyExisting
            ? 'Des données existent déjà pour ce mois — vos modifications les remplaceront.'
            : "Aucune donnée enregistrée pour ce mois. Vous pouvez saisir des données passées pour compléter votre historique."}
        </p>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap gap-2.5">
          <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
            <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">Revenus</div>
            <div className="font-display text-lg font-semibold text-[var(--emerald)]">
              {fmtMoney(totals.income)}
            </div>
          </div>
          <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
            <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">Dépenses</div>
            <div className="font-display text-lg font-semibold text-[var(--red)]">
              {fmtMoney(totals.expenses)}
            </div>
          </div>
          <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
            <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">Épargné</div>
            <div
              className={`font-display text-lg font-semibold ${totals.net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--red)]'}`}
            >
              {totals.net >= 0 ? '+' : ''}
              {fmtMoney(totals.net)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Comptes — valeurs et performance</div>
        <div className="divide-y divide-[var(--border)]">
          {data.accounts.map((acc) => {
            const latest = getLatestOverride(data, acc.id)
            const investedRaw = investedValues[acc.id] ?? ''
            const suggested = computeSuggestedMovement(
              data,
              acc.id,
              month,
              investedRaw !== '' ? Number(investedRaw.replace(',', '.')) : undefined,
            )
            return (
              <div key={acc.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{acc.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{acc.category}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <input
                      value={accountValues[acc.id] ?? ''}
                      onChange={(e) => setAccountValues({ ...accountValues, [acc.id]: e.target.value })}
                      placeholder="0"
                      inputMode="decimal"
                      className="w-[140px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
                    />
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <input
                        value={investedValues[acc.id] ?? ''}
                        onChange={(e) => setInvestedValues({ ...investedValues, [acc.id]: e.target.value })}
                        placeholder="investi"
                        inputMode="decimal"
                        className="w-[78px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right text-[11px] text-[var(--text-muted)] outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={gainValues[acc.id] ?? ''}
                        onChange={(e) => setGainValues({ ...gainValues, [acc.id]: e.target.value })}
                        placeholder="+/- €"
                        inputMode="decimal"
                        className="w-[78px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right text-[11px] text-[var(--text-muted)] outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={pctValues[acc.id] ?? ''}
                        onChange={(e) => setPctValues({ ...pctValues, [acc.id]: e.target.value })}
                        placeholder="%"
                        inputMode="decimal"
                        className="w-[78px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right text-[11px] text-[var(--text-muted)] outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={movementValues[acc.id] ?? ''}
                        onChange={(e) => setMovementValues({ ...movementValues, [acc.id]: e.target.value })}
                        placeholder={suggested !== null ? `≈ ${suggested >= 0 ? '+' : ''}${Math.round(suggested)}` : 'apport'}
                        inputMode="decimal"
                        className="w-[78px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right text-[11px] text-[var(--text-muted)] outline-none focus:border-[var(--gold)]"
                      />
                    </div>
                    {latest && (
                      <div className="max-w-[260px] text-right text-[10px] text-[var(--text-faint)]">
                        connu :{' '}
                        {[
                          latest.totalInvested !== undefined ? `investi ${fmtMoney(latest.totalInvested)}` : null,
                          latest.gainEur !== undefined
                            ? `${latest.gainEur >= 0 ? '+' : ''}${fmtMoney(latest.gainEur)}`
                            : null,
                          latest.pct !== undefined ? `${latest.pct >= 0 ? '+' : ''}${latest.pct.toFixed(1)}%` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}{' '}
                        ({fmtMonthShort(latest.date)})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--text-faint)]">
          Montants pré-remplis avec la valeur connue la plus proche. Les petits champs sont optionnels :
          "investi"/"+/- €"/"%" pour la performance réelle (ce qu'affiche votre courtier). Le champ "apport" se
          calcule tout seul si vous renseignez "investi" ce mois-ci et l'aviez déjà fait un mois précédent —
          laissez-le vide pour utiliser la suggestion, ou tapez votre propre montant pour la remplacer.
        </p>
      </div>

      {data.debts.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Dettes — solde restant dû</div>
          <div className="divide-y divide-[var(--border)]">
            {data.debts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{d.category}</div>
                </div>
                <input
                  value={debtValues[d.id] ?? ''}
                  onChange={(e) => setDebtValues({ ...debtValues, [d.id]: e.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                  className="w-[140px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Revenus par catégorie</div>
        <div className="divide-y divide-[var(--border)]">
          {data.incomeCategories.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </span>
              <input
                value={incomeValues[c.name] ?? ''}
                onChange={(e) => setIncomeValues({ ...incomeValues, [c.name]: e.target.value })}
                placeholder="0 ou 10+900+20"
                className="w-[160px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Dépenses par catégorie</div>
        <div className="divide-y divide-[var(--border)]">
          {data.expenseCategories.map((c) => {
            const budget = data.expenseBudgets[c.name]
            const actual = parseSum(expenseValues[c.name] ?? '')
            const actualSafe = Number.isNaN(actual) ? 0 : actual
            const pct = budget ? Math.min(150, (actualSafe / budget) * 100) : 0
            const over = budget !== undefined && actualSafe > budget
            return (
              <div key={c.name} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <input
                    value={expenseValues[c.name] ?? ''}
                    onChange={(e) => setExpenseValues({ ...expenseValues, [c.name]: e.target.value })}
                    placeholder="0 ou 10+900+20"
                    className="w-[160px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm outline-none focus:border-[var(--gold)]"
                  />
                </div>
                {budget !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: over ? 'var(--red)' : 'var(--emerald)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] whitespace-nowrap text-[var(--text-faint)]">
                      {fmtMoney(actualSafe)} / {fmtMoney(budget)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-[var(--red)]">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="font-display w-full rounded-full bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving ? 'Enregistrement…' : hasAnyExisting ? 'Enregistrer les modifications' : 'Valider le mois'}
      </button>

      {hasAnyExisting && (
        <button
          onClick={handleDelete}
          disabled={saving}
          className="font-display w-full rounded-full border border-[rgba(236,111,111,0.4)] px-4 py-3 text-sm font-semibold text-[var(--red)] disabled:opacity-40"
        >
          Supprimer les données de {fmtMonth(month)}
        </button>
      )}
    </div>
  )
}
