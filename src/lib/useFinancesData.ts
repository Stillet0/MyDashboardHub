import { useSyncedJson } from './useSyncedJson'
import type { FinancesData } from './finances'

const PATH = 'data/finances.json'

const DEFAULT: FinancesData = {
  accounts: [],
  categories: [],
  incomeCategories: [],
  expenseCategories: [],
  snapshots: [],
  cashflows: [],
  debts: [],
  debtCategories: [],
  expenseBudgets: {},
  targetAllocation: {},
  benchmarkName: 'MSCI World',
  benchmarkAvgMonthlyReturn: 0.65,
  goal: null,
}

export function useFinancesData() {
  return useSyncedJson<FinancesData>(PATH, DEFAULT)
}
