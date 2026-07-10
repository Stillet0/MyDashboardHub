import {
  avgMonthlyGrowth,
  cashflowForMonth,
  cashflowTotals,
  categoryColor,
  computeDelta,
  debtCategoryColor,
  emergencyFundStatus,
  findSnapshotByMonth,
  fmtMonth,
  fmtMonthShort,
  fmtMoney,
  goalProjection,
  shiftMonth,
  snapshotByCategory,
  snapshotDebtByCategory,
  snapshotDebtTotal,
  snapshotNetWorth,
  snapshotTotal,
  sortedSnapshots,
  type FinancesData,
} from '../../lib/finances'
import EvolutionChart from './EvolutionChart'

function DeltaBadge({ label, diff, pct }: { label: string; diff: number | null; pct: number | null }) {
  if (diff === null) {
    return (
      <span className="font-display rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
        {label} —
      </span>
    )
  }
  const cls = Math.abs(diff) < 0.5 ? 'text-[var(--text-muted)] bg-[var(--surface-2)]' : diff >= 0
    ? 'text-[var(--emerald)] bg-[rgba(62,207,142,0.14)]'
    : 'text-[var(--red)] bg-[rgba(236,111,111,0.14)]'
  const sign = diff >= 0 ? '+' : ''
  const pctStr = pct !== null ? ` (${sign}${pct.toFixed(1)}%)` : ''
  return (
    <span className={`font-display rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>
      {label} {sign}
      {fmtMoney(diff)}
      {pctStr}
    </span>
  )
}

export default function FinancesOverview({ data }: { data: FinancesData }) {
  if (data.accounts.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
        <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun compte pour l'instant</h3>
        <p>Ajoutez vos comptes pour commencer à suivre l'évolution de votre patrimoine.</p>
      </div>
    )
  }

  const snaps = sortedSnapshots(data)
  if (snaps.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
        <h3 className="font-display mb-2 text-xl text-[var(--text)]">Prêt pour votre premier relevé</h3>
        <p>Renseignez la valeur actuelle de chacun de vos comptes pour démarrer l'historique.</p>
      </div>
    )
  }

  const last = snaps[snaps.length - 1]
  const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null
  const totalGross = snapshotTotal(last)
  const totalDebt = snapshotDebtTotal(last)
  const total = totalGross - totalDebt
  const prevTotal = prev ? snapshotNetWorth(prev) : null
  const yoySnap = findSnapshotByMonth(data, shiftMonth(last.date, -12))
  const yoyTotal = yoySnap ? snapshotNetWorth(yoySnap) : null
  const momDelta = computeDelta(total, prevTotal)
  const yoyDelta = computeDelta(total, yoyTotal)

  const byCat = snapshotByCategory(data, last)
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const byDebtCat = snapshotDebtByCategory(data, last)
  const debtRows = Object.entries(byDebtCat).sort((a, b) => b[1] - a[1])

  const ef = emergencyFundStatus(data)
  const goalProj = goalProjection(data)
  const growth = avgMonthlyGrowth(data)
  const cf = cashflowForMonth(data, last.date)
  const cfTotals = cashflowTotals(cf)

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="font-display text-[44px] leading-tight font-bold tracking-tight">
              {fmtMoney(total)}
            </div>
            {prevTotal === null && yoyTotal === null ? (
              <div className="mt-2.5 text-sm text-[var(--text-muted)]">Premier relevé enregistré</div>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <DeltaBadge label="MoM" diff={momDelta.diff} pct={momDelta.pct} />
                <DeltaBadge label="YoY" diff={yoyDelta.diff} pct={yoyDelta.pct} />
              </div>
            )}
            {totalDebt > 0 && (
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                Patrimoine brut : {fmtMoney(totalGross)} · Dettes : -{fmtMoney(totalDebt)}
              </div>
            )}
          </div>
          <div className="font-display flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-[rgba(240,168,104,0.12)] text-center text-xs font-semibold text-[var(--gold)]">
            <b className="text-[15px] font-bold">{fmtMonthShort(last.date)}</b>
            {last.date.split('-')[0]}
          </div>
        </div>
        {snaps.length > 1 && (
          <div className="mt-5">
            <EvolutionChart
              points={snaps.map((s) => ({ label: s.date, value: snapshotNetWorth(s) }))}
            />
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 text-sm font-medium text-[var(--text-muted)]">Répartition par catégorie</div>
        <div className="space-y-3.5">
          {catRows.map(([cat, val]) => {
            const pct = totalGross > 0 ? (val / totalGross) * 100 : 0
            const color = categoryColor(data, cat)
            return (
              <div key={cat}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {cat}
                  </span>
                  <span className="font-display text-[var(--text-muted)]">
                    {fmtMoney(val)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {data.debts.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 text-sm font-medium text-[var(--text-muted)]">Dettes</div>
          <div className="space-y-3.5">
            {debtRows.map(([cat, val]) => {
              const pct = totalDebt > 0 ? (val / totalDebt) * 100 : 0
              const color = debtCategoryColor(data, cat)
              return (
                <div key={cat}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      {cat}
                    </span>
                    <span className="font-display text-[var(--text-muted)]">
                      {fmtMoney(val)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {ef && ef.avgExpense > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-sm font-medium text-[var(--text-muted)]">Fonds d'urgence</div>
          <div
            className={`font-display text-xl font-bold ${
              ef.months === null
                ? 'text-[var(--text-muted)]'
                : ef.months >= 6
                  ? 'text-[var(--emerald)]'
                  : ef.months >= 3
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--red)]'
            }`}
          >
            {ef.months !== null ? `${ef.months.toFixed(1)} mois` : '—'}
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-faint)]">
            {fmtMoney(ef.liquid)} de Cash + Livrets ÷ {fmtMoney(ef.avgExpense)} de dépenses mensuelles
            moyennes
          </p>
        </div>
      )}

      {goalProj && data.goal && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-sm font-medium text-[var(--text-muted)]">
            Objectif{data.goal.targetDate ? ` · ${fmtMonth(data.goal.targetDate)}` : ''}
          </div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-xl font-bold">{fmtMoney(goalProj.current)}</span>
            <span className="text-sm text-[var(--text-muted)]">
              sur {fmtMoney(data.goal.targetAmount)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--gold)]"
              style={{ width: `${goalProj.progressPct}%` }}
            />
          </div>
          {goalProj.monthsToGoal !== null ? (
            <p className="mt-2 text-xs text-[var(--text-faint)]">
              Au rythme actuel (+{fmtMoney(growth ?? 0)}/mois), objectif atteint vers{' '}
              <strong className="text-[var(--text)]">
                {goalProj.projectedDate ? fmtMonth(goalProj.projectedDate) : '—'}
              </strong>
              .
            </p>
          ) : goalProj.remaining <= 0 ? (
            <p className="mt-2 text-xs text-[var(--emerald)]">Objectif déjà atteint 🎉</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-faint)]">
              Pas assez de croissance récente pour projeter une date.
            </p>
          )}
        </div>
      )}

      {cf && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Cashflow · {fmtMonth(cf.date)}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
              <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
                Revenus
              </div>
              <div className="font-display text-lg font-semibold text-[var(--emerald)]">
                {fmtMoney(cfTotals.income)}
              </div>
            </div>
            <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
              <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
                Dépenses
              </div>
              <div className="font-display text-lg font-semibold text-[var(--red)]">
                {fmtMoney(cfTotals.expenses)}
              </div>
            </div>
            <div className="min-w-[130px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
              <div className="mb-1.5 text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
                Épargné
              </div>
              <div
                className={`font-display text-lg font-semibold ${cfTotals.net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--red)]'}`}
              >
                {cfTotals.net >= 0 ? '+' : ''}
                {fmtMoney(cfTotals.net)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
