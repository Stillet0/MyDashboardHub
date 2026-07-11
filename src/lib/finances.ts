export type Account = { id: string; name: string; category: string; value: number }
export type Category = { name: string; color: string }
export type PerfOverride = { totalInvested?: number; gainEur?: number; pct?: number }
export type Snapshot = {
  id: string
  date: string // 'YYYY-MM'
  entries: Record<string, number>
  debtEntries?: Record<string, number>
  perfOverrides?: Record<string, PerfOverride>
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

export function debtCategoryColor(data: FinancesData, name: string): string {
  return data.debtCategories.find((c) => c.name === name)?.color ?? '#8B93A1'
}

export function snapshotDebtByCategory(data: FinancesData, snap: Snapshot): Record<string, number> {
  const map: Record<string, number> = {}
  if (!snap.debtEntries) return map
  data.debts.forEach((d) => {
    const v = snap.debtEntries?.[d.id]
    if (v === undefined) return
    map[d.category] = (map[d.category] || 0) + Number(v)
  })
  return map
}

export function getDebtPrefillValue(data: FinancesData, debtId: string, monthKey: string): number | '' {
  const existingSnap = findSnapshotByMonth(data, monthKey)
  if (existingSnap?.debtEntries?.[debtId] !== undefined) return existingSnap.debtEntries[debtId]
  const priorSnaps = sortedSnapshots(data).filter((s) => s.date < monthKey)
  if (priorSnaps.length) {
    const prev = priorSnaps[priorSnaps.length - 1]
    if (prev.debtEntries?.[debtId] !== undefined) return prev.debtEntries[debtId]
  }
  const d = data.debts.find((x) => x.id === debtId)
  return d?.value ?? ''
}

export function computeDelta(curVal: number, compVal: number | null | undefined) {
  if (compVal === undefined || compVal === null) return { diff: null, pct: null }
  const diff = curVal - compVal
  const pct = compVal !== 0 ? (diff / Math.abs(compVal)) * 100 : null
  return { diff, pct }
}

export function parseSum(str: string): number {
  const cleaned = str.trim().replace(/,/g, '.').replace(/\s+/g, '')
  if (cleaned === '') return NaN
  if (!/^[0-9.+-]+$/.test(cleaned)) return NaN
  const tokens = cleaned.match(/[+-]?[0-9]*\.?[0-9]+/g)
  if (!tokens) return NaN
  return tokens.reduce((sum, t) => sum + parseFloat(t), 0)
}

export function getPrefillValue(data: FinancesData, accId: string, monthKey: string): number | '' {
  const existingSnap = findSnapshotByMonth(data, monthKey)
  if (existingSnap && existingSnap.entries[accId] !== undefined) return existingSnap.entries[accId]
  const priorSnaps = sortedSnapshots(data).filter((s) => s.date < monthKey)
  if (priorSnaps.length) {
    const prev = priorSnaps[priorSnaps.length - 1]
    if (prev.entries[accId] !== undefined) return prev.entries[accId]
  }
  const acc = data.accounts.find((a) => a.id === accId)
  return acc?.value ?? ''
}

export function nextUpdateMonth(data: FinancesData): string | null {
  const snaps = sortedSnapshots(data)
  if (snaps.length === 0) return currentMonthKey()
  const last = snaps[snaps.length - 1].date
  if (last >= currentMonthKey()) return null
  return shiftMonth(last, 1)
}

export function nextCashflowMonth(data: FinancesData): string | null {
  const cfs = sortedCashflows(data)
  if (cfs.length === 0) return currentMonthKey()
  const last = cfs[cfs.length - 1].date
  if (last >= currentMonthKey()) return null
  return shiftMonth(last, 1)
}

export function nextEntryMonth(data: FinancesData): string | null {
  const a = nextUpdateMonth(data)
  const b = nextCashflowMonth(data)
  if (a === null && b === null) return null
  if (a === null) return b
  if (b === null) return a
  return a < b ? a : b
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

// ---------------------------------------------------------------------------
// Performance tracking (rendement) — money-weighted gain/% per account,
// category, or the whole portfolio, using the person's own broker-reported
// figures when available and falling back to an estimate from the account's
// value deltas and cashflow movements otherwise.
// ---------------------------------------------------------------------------

export const PERFORMANCE_EXCLUDED_CATEGORIES = ['Cash']
export const NO_COMPUTED_FALLBACK_CATEGORIES = ['Livrets', 'PEL']

/** Value change of a set of accounts for a month, minus that month's net contributions/withdrawals. */
export function performanceForMonthAccounts(
  data: FinancesData,
  accIds: string[],
  monthKey: string,
): number | null {
  const snaps = sortedSnapshots(data)
  const idx = snaps.findIndex((s) => s.date === monthKey)
  if (idx <= 0) return null
  const cur = accIds.reduce((s, id) => s + (Number(snaps[idx].entries[id]) || 0), 0)
  const prev = accIds.reduce((s, id) => s + (Number(snaps[idx - 1].entries[id]) || 0), 0)
  const cf = cashflowForMonth(data, monthKey)
  const movements = cf ? accIds.reduce((s, id) => s + (Number(cf.movements[id]) || 0), 0) : 0
  return cur - prev - movements
}

export function computedCumulativeGainEur(
  data: FinancesData,
  accIds: string[],
  uptoMonthKey?: string,
): number | null {
  const snaps = sortedSnapshots(data).filter((s) => !uptoMonthKey || s.date <= uptoMonthKey)
  if (accIds.length === 0 || snaps.length < 2) return null
  let cumGain = 0
  for (let i = 1; i < snaps.length; i++) {
    const perf = performanceForMonthAccounts(data, accIds, snaps[i].date)
    if (perf !== null) cumGain += perf
  }
  return cumGain
}

export function computedCumulativePercent(
  data: FinancesData,
  accIds: string[],
  uptoMonthKey?: string,
): number | null {
  const snaps = sortedSnapshots(data).filter((s) => !uptoMonthKey || s.date <= uptoMonthKey)
  if (accIds.length === 0 || snaps.length < 2) return null
  let cumInvested = 0
  for (let i = 1; i < snaps.length; i++) {
    const cf = cashflowForMonth(data, snaps[i].date)
    if (cf) cumInvested += accIds.reduce((s, id) => s + (Number(cf.movements[id]) || 0), 0)
  }
  const cumGain = computedCumulativeGainEur(data, accIds, uptoMonthKey)
  if (cumGain === null || cumInvested <= 0) return null
  return (cumGain / cumInvested) * 100
}

/** Most recent broker-reported figures for an account, at or before a given month. */
export function getLatestOverride(
  data: FinancesData,
  accountId: string,
  uptoMonthKey?: string,
): (PerfOverride & { date: string }) | null {
  const snaps = [...data.snapshots]
    .filter((s) => !uptoMonthKey || s.date <= uptoMonthKey)
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const s of snaps) {
    const o = s.perfOverrides?.[accountId]
    if (o && (o.totalInvested !== undefined || o.gainEur !== undefined || o.pct !== undefined)) {
      return { ...o, date: s.date }
    }
  }
  return null
}

export function getLatestOverrideBefore(
  data: FinancesData,
  accountId: string,
  monthKey: string,
): { totalInvested: number; date: string } | null {
  const snaps = [...data.snapshots]
    .filter((s) => s.date < monthKey)
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const s of snaps) {
    const o = s.perfOverrides?.[accountId]
    if (o?.totalInvested !== undefined) return { totalInvested: o.totalInvested, date: s.date }
  }
  return null
}

/** Auto-suggests this month's contribution/withdrawal from the change in "totalInvested". */
export function computeSuggestedMovement(
  data: FinancesData,
  accountId: string,
  monthKey: string,
  currentInvestedValue: number | undefined,
): number | null {
  if (currentInvestedValue === undefined || Number.isNaN(currentInvestedValue)) return null
  const prev = getLatestOverrideBefore(data, accountId, monthKey)
  if (!prev) return null
  return currentInvestedValue - prev.totalInvested
}

type EffectiveGain = { gainEur: number | null; pct: number | null; source: 'manual' | 'computed'; date?: string }

export function accountEffectiveGain(
  data: FinancesData,
  accountId: string,
  monthKey?: string,
): EffectiveGain | null {
  const snaps = sortedSnapshots(data)
  const resolvedMonth = monthKey ?? (snaps.length ? snaps[snaps.length - 1].date : undefined)
  const snap = resolvedMonth ? snaps.find((s) => s.date === resolvedMonth) : undefined
  const curVal = snap ? Number(snap.entries[accountId]) || 0 : 0
  const ov = getLatestOverride(data, accountId, resolvedMonth)
  if (ov) {
    let gainEur = ov.gainEur
    let pct = ov.pct
    if (gainEur === undefined && ov.totalInvested !== undefined) {
      gainEur = curVal - ov.totalInvested
    }
    if (pct === undefined && gainEur !== undefined && ov.totalInvested) {
      pct = (gainEur / ov.totalInvested) * 100
    }
    if (gainEur === undefined && pct !== undefined && 100 + pct !== 0) {
      gainEur = (curVal * pct) / (100 + pct)
    }
    if (gainEur !== undefined || pct !== undefined) {
      return {
        gainEur: gainEur ?? null,
        pct: pct ?? null,
        source: 'manual',
        date: ov.date,
      }
    }
  }
  const acc = data.accounts.find((a) => a.id === accountId)
  if (acc && NO_COMPUTED_FALLBACK_CATEGORIES.includes(acc.category)) return null
  return {
    gainEur: computedCumulativeGainEur(data, [accountId], resolvedMonth),
    pct: computedCumulativePercent(data, [accountId], resolvedMonth),
    source: 'computed',
  }
}

export function effectiveForAccounts(
  data: FinancesData,
  accIds: string[],
  monthKey?: string,
): { gainEur: number | null; pct: number | null; mixed: boolean } | null {
  if (!accIds || accIds.length === 0) return null
  const snaps = sortedSnapshots(data)
  if (snaps.length === 0) return null
  const resolvedMonth = monthKey ?? snaps[snaps.length - 1].date
  const snap = snaps.find((s) => s.date === resolvedMonth)
  if (!snap) return null
  let gainSum = 0
  let hasGain = false
  let weightedPct = 0
  let weightTotal = 0
  let anyManual = false
  accIds.forEach((id) => {
    const eff = accountEffectiveGain(data, id, resolvedMonth)
    if (!eff) return
    if (eff.source === 'manual') anyManual = true
    if (eff.gainEur !== null) {
      gainSum += eff.gainEur
      hasGain = true
    }
    const val = Number(snap.entries[id]) || 0
    if (eff.pct !== null && val > 0) {
      weightedPct += eff.pct * val
      weightTotal += val
    }
  })
  if (!hasGain && weightTotal === 0) return null
  return {
    gainEur: hasGain ? gainSum : null,
    pct: weightTotal > 0 ? weightedPct / weightTotal : null,
    mixed: anyManual,
  }
}

export function categoryEffective(data: FinancesData, catName: string, monthKey?: string) {
  if (PERFORMANCE_EXCLUDED_CATEGORIES.includes(catName)) return null
  return effectiveForAccounts(
    data,
    data.accounts.filter((a) => a.category === catName).map((a) => a.id),
    monthKey,
  )
}

export function totalEffective(data: FinancesData, monthKey?: string) {
  const accIds = data.accounts
    .filter((a) => !PERFORMANCE_EXCLUDED_CATEGORIES.includes(a.category))
    .map((a) => a.id)
  return effectiveForAccounts(data, accIds, monthKey)
}

export type PctPoint = { date: string; pct: number | null }

export function categoryPercentSeries(data: FinancesData, catName: string): PctPoint[] {
  const snaps = sortedSnapshots(data)
  const accIds = data.accounts.filter((a) => a.category === catName).map((a) => a.id)
  if (accIds.length === 0) return []
  return snaps.map((snap, idx) => {
    if (idx === 0) return { date: snap.date, pct: null }
    let weightedPct = 0
    let weightTotal = 0
    accIds.forEach((id) => {
      const eff = accountEffectiveGain(data, id, snap.date)
      const pct = eff?.pct
      if (pct === null || pct === undefined || !isFinite(pct)) return
      const val = Number(snap.entries[id]) || 0
      if (val > 0) {
        weightedPct += pct * val
        weightTotal += val
      }
    })
    return { date: snap.date, pct: weightTotal > 0 ? weightedPct / weightTotal : null }
  })
}

export function totalPercentSeries(data: FinancesData): PctPoint[] {
  const snaps = sortedSnapshots(data)
  const accIds = data.accounts
    .filter((a) => !PERFORMANCE_EXCLUDED_CATEGORIES.includes(a.category))
    .map((a) => a.id)
  if (accIds.length === 0) return []
  return snaps.map((snap, idx) => {
    if (idx === 0) return { date: snap.date, pct: null }
    let weightedPct = 0
    let weightTotal = 0
    accIds.forEach((id) => {
      const eff = accountEffectiveGain(data, id, snap.date)
      const pct = eff?.pct
      if (pct === null || pct === undefined || !isFinite(pct)) return
      const val = Number(snap.entries[id]) || 0
      if (val > 0) {
        weightedPct += pct * val
        weightTotal += val
      }
    })
    return { date: snap.date, pct: weightTotal > 0 ? weightedPct / weightTotal : null }
  })
}

export function benchmarkCumulativeSeries(data: FinancesData): PctPoint[] {
  const snaps = sortedSnapshots(data)
  const r = Number(data.benchmarkAvgMonthlyReturn) || 0
  return snaps.map((snap, idx) => {
    if (idx === 0) return { date: snap.date, pct: null }
    return { date: snap.date, pct: (Math.pow(1 + r / 100, idx) - 1) * 100 }
  })
}
