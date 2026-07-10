import {
  cashflowTotals,
  fmtMonth,
  fmtMoney,
  snapshotDebtTotal,
  snapshotNetWorth,
  sortedCashflows,
  sortedSnapshots,
  type FinancesData,
} from '../../lib/finances'

export default function FinancesHistory({ data }: { data: FinancesData }) {
  const snaps = [...sortedSnapshots(data)].reverse()
  const cfs = [...sortedCashflows(data)].reverse()
  const hasDebts = data.debts.length > 0

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-normal">Historique</h2>

      {snaps.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun historique</h3>
          <p>Votre historique apparaîtra ici après votre premier relevé mensuel.</p>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Patrimoine net</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
                  <th className="pb-2.5 text-left font-medium">Mois</th>
                  <th className="pb-2.5 text-right font-medium">Patrimoine net</th>
                  {hasDebts && <th className="pb-2.5 text-right font-medium">Dettes</th>}
                  <th className="pb-2.5 text-right font-medium">Variation</th>
                </tr>
              </thead>
              <tbody>
                {snaps.map((s, idx) => {
                  const total = snapshotNetWorth(s)
                  const debt = snapshotDebtTotal(s)
                  const prevSnap = snaps[idx + 1]
                  const diff = prevSnap ? total - snapshotNetWorth(prevSnap) : null
                  return (
                    <tr key={s.id} className="border-b border-[var(--border)] last:border-none">
                      <td className="py-2.5 text-left">{fmtMonth(s.date)}</td>
                      <td className="font-display py-2.5 text-right font-semibold text-[var(--gold)]">
                        {fmtMoney(total)}
                      </td>
                      {hasDebts && (
                        <td className="font-display py-2.5 text-right text-[var(--red)]">
                          {debt > 0 ? '-' : ''}
                          {fmtMoney(debt)}
                        </td>
                      )}
                      <td className="font-display py-2.5 text-right">
                        {diff === null ? (
                          <span className="text-[var(--text-faint)]">—</span>
                        ) : (
                          <span
                            className={
                              diff > 0.5
                                ? 'text-[var(--emerald)]'
                                : diff < -0.5
                                  ? 'text-[var(--red)]'
                                  : undefined
                            }
                          >
                            {diff >= 0 ? '+' : ''}
                            {fmtMoney(diff)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cfs.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">Cashflow</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
                  <th className="pb-2.5 text-left font-medium">Mois</th>
                  <th className="pb-2.5 text-right font-medium">Revenus</th>
                  <th className="pb-2.5 text-right font-medium">Dépenses</th>
                  <th className="pb-2.5 text-right font-medium">Épargné</th>
                </tr>
              </thead>
              <tbody>
                {cfs.map((cf) => {
                  const t = cashflowTotals(cf)
                  return (
                    <tr key={cf.id} className="border-b border-[var(--border)] last:border-none">
                      <td className="py-2.5 text-left">{fmtMonth(cf.date)}</td>
                      <td className="font-display py-2.5 text-right">{fmtMoney(t.income)}</td>
                      <td className="font-display py-2.5 text-right">{fmtMoney(t.expenses)}</td>
                      <td
                        className={`font-display py-2.5 text-right ${t.net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--red)]'}`}
                      >
                        {t.net >= 0 ? '+' : ''}
                        {fmtMoney(t.net)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
