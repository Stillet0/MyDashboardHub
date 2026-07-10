export type Account = { id: string; name: string; category: string; value: number }
export type Category = { name: string; color: string }
export type Snapshot = {
  id: string
  date: string // 'YYYY-MM'
  entries: Record<string, number>
  debtEntries?: Record<string, number>
}
export type Cashflow = {
  id: string
  date: string
  income: Record<string, number>
  expenses: Record<string, number>
  movements: Record<string, number>
}
export type Debt = { id: string; name: string; category: string; value: number }
export type Goal = { targetAmount: number; targetDate: string | null } | null

export type FinancesData = {
  accounts: Account[]
  categories: Category[]
  incomeCategories: Category[]
  expenseCategories: Category[]
  snapshots: Snapshot[]
  cashflows: Cashflow[]
  debts: Debt[]
  debtCategories: Category[]
  expenseBudgets: Record<string, number>
  targetAllocation: Record<string, number>
  benchmarkName: string
  benchmarkAvgMonthlyReturn: number
  goal: Goal
}

export function fmtMoney(v: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' €'
}

export function fmtMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fmtMonthShort(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d).replace('.', '')
}

export function currentMonthKey(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function shiftMonth(key: string, delta: number): string {
  let [y, m] = key.split('-').map(Number)
  m += delta
  while (m > 12) {
    m -= 12
    y += 1
  }
  while (m < 1) {
    m += 12
    y -= 1
  }
  return y + '-' + String(m).padStart(2, '0')
}

export function sortedSnapshots(data: FinancesData): Snapshot[] {
  return [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date))
}

export function sortedCashflows(data: FinancesData): Cashflow[] {
  return [...data.cashflows].sort((a, b) => a.date.localeCompare(b.date))
}

export function snapshotTotal(snap: Snapshot): number {
  return Object.values(snap.entries).reduce((s, v) => s + (Number(v) || 0), 0)
}

export function snapshotDebtTotal(snap: Snapshot): number {
  if (!snap.debtEntries) return 0
  return Object.values(snap.debtEntries).reduce((s, v) => s + (Number(v) || 0), 0)
}

export function snapshotNetWorth(snap: Snapshot): number {
  return snapshotTotal(snap) - snapshotDebtTotal(snap)
}

export function snapshotByCategory(data: FinancesData, snap: Snapshot): Record<string, number> {
  const map: Record<string, number> = {}
  data.accounts.forEach((acc) => {
    const v = snap.entries[acc.id]
    if (v === undefined) return
    map[acc.category] = (map[acc.category] || 0) + Number(v)
  })
  return map
}

export function categoryColor(data: FinancesData, name: string): string {
  return data.categories.find((c) => c.name === name)?.color ?? '#8B93A1'
}

export function computeDelta(curVal: number, compVal: number | null | undefined) {
  if (compVal === undefined || compVal === null) return { diff: null, pct: null }
  const diff = curVal - compVal
  const pct = compVal !== 0 ? (diff / Math.abs(compVal)) * 100 : null
  return { diff, pct }
}

export function findSnapshotByMonth(data: FinancesData, monthKey: string): Snapshot | undefined {
  return data.snapshots.find((s) => s.date === monthKey)
}

function cfSum(obj: Record<string, number> | undefined): number {
  return Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0)
}

export function cashflowForMonth(data: FinancesData, monthKey: string): Cashflow | undefined {
  return data.cashflows.find((c) => c.date === monthKey)
}

export function cashflowTotals(cf: Cashflow | undefined) {
  if (!cf) return { income: 0, expenses: 0, net: 0 }
  const income = cfSum(cf.income)
  const expenses = cfSum(cf.expenses)
  return { income, expenses, net: income - expenses }
}

export function emergencyFundStatus(data: FinancesData) {
  const snaps = sortedSnapshots(data)
  if (snaps.length === 0) return null
  const last = snaps[snaps.length - 1]
  const byCat = snapshotByCategory(data, last)
  const liquid = (byCat['Cash'] || 0) + (byCat['Livrets'] || 0)
  const cfs = sortedCashflows(data).slice(-6)
  const avgExpense = cfs.length
    ? cfs.reduce((s, cf) => s + cashflowTotals(cf).expenses, 0) / cfs.length
    : null
  if (!avgExpense || avgExpense <= 0) return { liquid, avgExpense: avgExpense || 0, months: null }
  return { liquid, avgExpense, months: liquid / avgExpense }
}

export function avgMonthlyGrowth(data: FinancesData): number | null {
  const snaps = sortedSnapshots(data)
  if (snaps.length < 2) return null
  const recent = snaps.slice(-7)
  let total = 0
  let count = 0
  for (let i = 1; i < recent.length; i++) {
    total += snapshotNetWorth(recent[i]) - snapshotNetWorth(recent[i - 1])
    count++
  }
  return count > 0 ? total / count : null
}

export function goalProjection(data: FinancesData) {
  if (!data.goal || !data.goal.targetAmount) return null
  const snaps = sortedSnapshots(data)
  if (snaps.length === 0) return null
  const current = snapshotNetWorth(snaps[snaps.length - 1])
  const growth = avgMonthlyGrowth(data)
  const remaining = data.goal.targetAmount - current
  let monthsToGoal: number | null = null
  let projectedDate: string | null = null
  if (growth !== null && growth > 0 && remaining > 0) {
    monthsToGoal = Math.ceil(remaining / growth)
    projectedDate = shiftMonth(currentMonthKey(), monthsToGoal)
  }
  const progressPct =
    data.goal.targetAmount > 0
      ? Math.min(100, Math.max(0, (current / data.goal.targetAmount) * 100))
      : 0
  return { current, remaining, growth, monthsToGoal, projectedDate, progressPct }
}
