import {
  benchmarkCumulativeSeries,
  categoryPercentSeries,
  fmtMoney,
  fmtMonth,
  PERFORMANCE_EXCLUDED_CATEGORIES,
  sortedCashflows,
  sortedSnapshots,
  totalPercentSeries,
  type FinancesData,
} from '../../lib/finances'
import CompositionChart from './charts/CompositionChart'
import MultiLineChart from './charts/MultiLineChart'

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

export default function FinancesGraphs({ data }: { data: FinancesData }) {
  const snaps = sortedSnapshots(data)
  const cfs = sortedCashflows(data)

  if (snaps.length < 2 && cfs.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
        <h3 className="font-display mb-2 text-xl text-[var(--text)]">Pas encore assez de données</h3>
        <p>Renseignez au moins deux relevés mensuels et un cashflow pour voir vos graphiques d'évolution.</p>
      </div>
    )
  }

  const perfCategories = data.categories.filter((c) => !PERFORMANCE_EXCLUDED_CATEGORIES.includes(c.name))
  const rendementSeries = perfCategories
    .map((c) => ({
      name: c.name,
      color: c.color,
      data: categoryPercentSeries(data, c.name).map((p) => ({ date: p.date, value: p.pct })),
    }))
    .filter((s) => s.data.some((d) => d.value !== null && isFinite(d.value)))

  const portfolioSeries = totalPercentSeries(data)
  const benchmarkSeries = benchmarkCumulativeSeries(data)
  const lastP = [...portfolioSeries].reverse().find((d) => d.pct !== null)
  const lastB = [...benchmarkSeries].reverse().find((d) => d.pct !== null)
  const vsBenchmarkDiff = lastP && lastB && lastP.pct !== null && lastB.pct !== null ? lastP.pct - lastB.pct : null

  const totalsByExpenseCat: Record<string, number> = {}
  cfs.forEach((cf) => {
    Object.entries(cf.expenses).forEach(([cat, val]) => {
      totalsByExpenseCat[cat] = (totalsByExpenseCat[cat] || 0) + (Number(val) || 0)
    })
  })
  const totalExpensesAllTime = Object.values(totalsByExpenseCat).reduce((s, v) => s + v, 0)
  const expenseBreakdown = data.expenseCategories
    .map((c) => ({ name: c.name, color: c.color, value: totalsByExpenseCat[c.name] || 0 }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-normal">Graphiques</h2>

      {snaps.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Évolution de la répartition du patrimoine
          </div>
          <CompositionChart data={data} snapshots={snaps} />
        </div>
      )}

      {rendementSeries.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Rendement (%) de chaque placement, mois par mois
          </div>
          <MultiLineChart series={rendementSeries} formatValue={fmtPct} />
          <p className="mt-3 text-xs text-[var(--text-faint)]">
            Utilise votre % saisi dans "Mise à jour" dès qu'il existe pour un mois donné, sinon une estimation
            calculée à partir de vos relevés. Cash, Livrets et PEL ne sont pas inclus.
          </p>
        </div>
      )}

      {snaps.length > 1 && portfolioSeries.some((p) => p.pct !== null) && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-2 text-sm font-medium text-[var(--text-muted)]">
            Portefeuille vs {data.benchmarkName}
          </div>
          {vsBenchmarkDiff !== null && (
            <div
              className={`mb-3 text-sm font-semibold ${
                vsBenchmarkDiff > 0.5
                  ? 'text-[var(--emerald)]'
                  : vsBenchmarkDiff < -0.5
                    ? 'text-[var(--red)]'
                    : 'text-[var(--text-muted)]'
              }`}
            >
              {vsBenchmarkDiff >= 0 ? '+' : ''}
              {vsBenchmarkDiff.toFixed(1)} pt {vsBenchmarkDiff >= 0 ? 'au-dessus' : 'en dessous'} de{' '}
              {data.benchmarkName}
            </div>
          )}
          <MultiLineChart
            series={[
              {
                name: 'Mon portefeuille',
                color: '#F0A868',
                data: portfolioSeries.map((p) => ({ date: p.date, value: p.pct })),
              },
              {
                name: data.benchmarkName,
                color: '#5CC8E0',
                data: benchmarkSeries.map((p) => ({ date: p.date, value: p.pct })),
              },
            ]}
            formatValue={fmtPct}
          />
          <p className="mt-3 text-xs text-[var(--text-faint)]">
            Comparaison approximative : votre performance est pondérée par la valeur des comptes, l'indice est
            un rendement composé mensuel appliqué au taux moyen configuré dans Objectifs & Budget.
          </p>
        </div>
      )}

      {cfs.length > 1 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">
            Revenus vs Dépenses dans le temps
          </div>
          <MultiLineChart
            series={[
              {
                name: 'Revenus',
                color: '#3ECF8E',
                data: cfs.map((cf) => ({
                  date: cf.date,
                  value: Object.values(cf.income).reduce((s, v) => s + (Number(v) || 0), 0),
                })),
              },
              {
                name: 'Dépenses',
                color: '#E5697A',
                data: cfs.map((cf) => ({
                  date: cf.date,
                  value: Object.values(cf.expenses).reduce((s, v) => s + (Number(v) || 0), 0),
                })),
              },
            ]}
            formatValue={fmtMoney}
          />
        </div>
      )}

      {expenseBreakdown.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 text-sm font-medium text-[var(--text-muted)]">
            Répartition des dépenses par catégorie · {fmtMonth(cfs[0].date)} → {fmtMonth(cfs[cfs.length - 1].date)}
          </div>
          <div className="space-y-3.5">
            {expenseBreakdown.map((item) => {
              const pct = totalExpensesAllTime > 0 ? (item.value / totalExpensesAllTime) * 100 : 0
              return (
                <div key={item.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-display text-[var(--text-muted)]">
                      {fmtMoney(item.value)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
