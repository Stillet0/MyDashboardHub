export type RecurrenceUnit = 'jour' | 'semaine' | 'mois' | 'an'
export type Recurrence = { unit: RecurrenceUnit; interval: number }

export const RECURRENCE_OPTIONS: Array<{ value: string; label: string; recurrence: Recurrence | null }> = [
  { value: '', label: 'Ne se répète pas', recurrence: null },
  { value: 'jour_1', label: 'Chaque jour', recurrence: { unit: 'jour', interval: 1 } },
  { value: 'semaine_1', label: 'Chaque semaine', recurrence: { unit: 'semaine', interval: 1 } },
  { value: 'semaine_2', label: 'Toutes les 2 semaines', recurrence: { unit: 'semaine', interval: 2 } },
  { value: 'mois_1', label: 'Chaque mois', recurrence: { unit: 'mois', interval: 1 } },
  { value: 'mois_3', label: 'Tous les 3 mois', recurrence: { unit: 'mois', interval: 3 } },
  { value: 'mois_6', label: 'Tous les 6 mois', recurrence: { unit: 'mois', interval: 6 } },
  { value: 'an_1', label: 'Chaque année', recurrence: { unit: 'an', interval: 1 } },
]

export function recurrenceToOptionValue(r: Recurrence | undefined): string {
  if (!r) return ''
  const match = RECURRENCE_OPTIONS.find((o) => o.recurrence && o.recurrence.unit === r.unit && o.recurrence.interval === r.interval)
  return match ? match.value : ''
}

export function optionValueToRecurrence(value: string): Recurrence | undefined {
  return RECURRENCE_OPTIONS.find((o) => o.value === value)?.recurrence ?? undefined
}

/** Avance une date 'YYYY-MM-DD' de l'intervalle de récurrence donné. */
export function nextRecurrenceDate(fromDateKey: string, r: Recurrence): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fromDateKey)
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date()
  if (Number.isNaN(date.getTime())) date.setTime(Date.now())
  if (r.unit === 'jour') date.setDate(date.getDate() + r.interval)
  else if (r.unit === 'semaine') date.setDate(date.getDate() + r.interval * 7)
  else if (r.unit === 'mois') date.setMonth(date.getMonth() + r.interval)
  else date.setFullYear(date.getFullYear() + r.interval)
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function fmtRecurrence(r: Recurrence): string {
  if (r.interval === 1) {
    return { jour: 'Chaque jour', semaine: 'Chaque semaine', mois: 'Chaque mois', an: 'Chaque année' }[r.unit]
  }
  return {
    jour: `Tous les ${r.interval} jours`,
    semaine: `Toutes les ${r.interval} semaines`,
    mois: `Tous les ${r.interval} mois`,
    an: `Tous les ${r.interval} ans`,
  }[r.unit]
}
