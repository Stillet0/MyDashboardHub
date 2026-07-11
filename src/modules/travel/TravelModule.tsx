import { useState } from 'react'
import { useTravelData } from '../../lib/useTravelData'
import {
  expensesForTrip,
  fmtDateRange,
  fmtEuro,
  isPast,
  sortedTrips,
  totalSpent,
  type Expense,
  type Trip,
  type TravelData,
} from '../../lib/travel'
import { newChecklistItem } from '../../lib/checklist'
import AiSuggestPanel from '../../components/AiSuggestPanel'

type TripDraft = { name: string; destination: string; startDate: string; endDate: string; budget: string }
type ExpenseDraft = { label: string; amount: string; date: string }

const emptyTripDraft = (): TripDraft => ({ name: '', destination: '', startDate: '', endDate: '', budget: '' })
const emptyExpenseDraft = (): ExpenseDraft => ({ label: '', amount: '', date: '' })

export default function TravelModule() {
  const { data, loading, error, saving, save } = useTravelData()
  const [addingTrip, setAddingTrip] = useState(false)
  const [tripDraft, setTripDraft] = useState<TripDraft>(emptyTripDraft())
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [editTripDraft, setEditTripDraft] = useState<TripDraft>(emptyTripDraft())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(emptyExpenseDraft())
  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const trips = sortedTrips(data.trips)

  async function handleAddTrip() {
    if (!data) return
    if (!tripDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const newTrip: Trip = {
      id: 'trip_' + Math.random().toString(36).slice(2, 10),
      name: tripDraft.name.trim(),
      destination: tripDraft.destination.trim() || undefined,
      startDate: tripDraft.startDate || undefined,
      endDate: tripDraft.endDate || undefined,
      budget: tripDraft.budget ? Number(tripDraft.budget.replace(',', '.')) : undefined,
    }
    await save({ ...data, trips: [...data.trips, newTrip] }, `Voyages: ajout de "${newTrip.name}"`)
    setTripDraft(emptyTripDraft())
    setAddingTrip(false)
  }

  function startEditTrip(t: Trip) {
    setEditingTripId(t.id)
    setEditTripDraft({
      name: t.name,
      destination: t.destination ?? '',
      startDate: t.startDate ?? '',
      endDate: t.endDate ?? '',
      budget: t.budget !== undefined ? String(t.budget) : '',
    })
    setFormError(null)
  }

  async function handleEditTripSave(id: string) {
    if (!data) return
    if (!editTripDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const nextTrips = data.trips.map((t) =>
      t.id === id
        ? {
            ...t,
            name: editTripDraft.name.trim(),
            destination: editTripDraft.destination.trim() || undefined,
            startDate: editTripDraft.startDate || undefined,
            endDate: editTripDraft.endDate || undefined,
            budget: editTripDraft.budget ? Number(editTripDraft.budget.replace(',', '.')) : undefined,
          }
        : t,
    )
    await save({ ...data, trips: nextTrips }, `Voyages: modification de "${editTripDraft.name}"`)
    setEditingTripId(null)
  }

  async function handleDeleteTrip(t: Trip) {
    if (!data) return
    if (!window.confirm(`Supprimer "${t.name}" et toutes ses dépenses ? Action irréversible.`)) return
    await save(
      {
        trips: data.trips.filter((x) => x.id !== t.id),
        expenses: data.expenses.filter((e) => e.tripId !== t.id),
      },
      `Voyages: suppression de "${t.name}"`,
    )
    if (expandedId === t.id) setExpandedId(null)
  }

  async function handleAddExpense(tripId: string) {
    if (!data) return
    const amount = Number(expenseDraft.amount.replace(',', '.'))
    if (!expenseDraft.label.trim() || Number.isNaN(amount)) {
      setFormError('Libellé et montant sont requis.')
      return
    }
    setFormError(null)
    const newExpense: Expense = {
      id: 'exp_' + Math.random().toString(36).slice(2, 10),
      tripId,
      label: expenseDraft.label.trim(),
      amount,
      date: expenseDraft.date || undefined,
    }
    await save({ ...data, expenses: [...data.expenses, newExpense] }, `Voyages: dépense "${newExpense.label}" ajoutée`)
    setExpenseDraft(emptyExpenseDraft())
  }

  async function handleDeleteExpense(e: Expense) {
    if (!data) return
    if (!window.confirm(`Supprimer la dépense "${e.label}" ?`)) return
    await save(
      { ...data, expenses: data.expenses.filter((x) => x.id !== e.id) },
      `Voyages: dépense "${e.label}" supprimée`,
    )
  }

  async function handleAddChecklistItems(t: Trip, items: string[]) {
    if (!data || items.length === 0) return
    const newItems = items.map((text) => newChecklistItem(text))
    const nextTrips = data.trips.map((x) =>
      x.id === t.id ? { ...x, checklist: [...(x.checklist ?? []), ...newItems] } : x,
    )
    await save({ ...data, trips: nextTrips }, `Voyages: suggestions IA ajoutées à "${t.name}"`)
  }

  async function toggleChecklistItem(t: Trip, itemId: string) {
    if (!data) return
    const nextTrips = data.trips.map((x) =>
      x.id === t.id
        ? { ...x, checklist: (x.checklist ?? []).map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
        : x,
    )
    await save({ ...data, trips: nextTrips }, `Voyages: liste mise à jour`)
  }

  async function removeChecklistItem(t: Trip, itemId: string) {
    if (!data) return
    const nextTrips = data.trips.map((x) =>
      x.id === t.id ? { ...x, checklist: (x.checklist ?? []).filter((c) => c.id !== itemId) } : x,
    )
    await save({ ...data, trips: nextTrips }, `Voyages: élément supprimé`)
  }

  function renderTripCard(t: Trip, allData: TravelData) {
    const past = isPast(t)
    const spent = totalSpent(allData, t.id)
    const expenses = expensesForTrip(allData, t.id)
    const expanded = expandedId === t.id
    const budgetPct = t.budget ? Math.min(100, (spent / t.budget) * 100) : 0
    const overBudget = t.budget !== undefined && spent > t.budget

    if (editingTripId === t.id) {
      return (
        <div key={t.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={editTripDraft.name}
              onChange={(e) => setEditTripDraft({ ...editTripDraft, name: e.target.value })}
              placeholder="Nom"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={editTripDraft.destination}
              onChange={(e) => setEditTripDraft({ ...editTripDraft, destination: e.target.value })}
              placeholder="Destination"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={editTripDraft.startDate}
              onChange={(e) => setEditTripDraft({ ...editTripDraft, startDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              type="date"
              value={editTripDraft.endDate}
              onChange={(e) => setEditTripDraft({ ...editTripDraft, endDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={editTripDraft.budget}
              onChange={(e) => setEditTripDraft({ ...editTripDraft, budget: e.target.value })}
              placeholder="Budget (€, optionnel)"
              inputMode="decimal"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleEditTripSave(t.id)}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditingTripId(null)}
              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={t.id}
        className={`rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 ${past ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {t.name}
              {past && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                  Terminé
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">
              {[t.destination, fmtDateRange(t.startDate, t.endDate)].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startEditTrip(t)}
              title="Modifier"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              ✎
            </button>
            <button
              onClick={() => handleDeleteTrip(t)}
              title="Supprimer"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
            >
              ✕
            </button>
          </div>
        </div>

        {t.budget !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${budgetPct}%`, background: overBudget ? 'var(--red)' : 'var(--gold)' }}
              />
            </div>
            <span
              className={`font-display text-xs whitespace-nowrap ${overBudget ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}
            >
              {fmtEuro(spent)} / {fmtEuro(t.budget)}
            </span>
          </div>
        )}
        {t.budget === undefined && spent > 0 && (
          <div className="mt-3 text-xs text-[var(--text-muted)]">{fmtEuro(spent)} dépensés</div>
        )}

        {t.checklist && t.checklist.length > 0 && (
          <div className="mt-3 space-y-1">
            {t.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => toggleChecklistItem(t, c.id)}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    c.done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
                  }`}
                >
                  {c.done && <span className="text-[9px] text-[#08090b]">✓</span>}
                </button>
                <span className={`flex-1 ${c.done ? 'text-[var(--text-faint)] line-through' : 'text-[var(--text-muted)]'}`}>
                  {c.text}
                </span>
                <button
                  onClick={() => removeChecklistItem(t, c.id)}
                  className="text-[var(--text-faint)] hover:text-[var(--red)]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!past && t.destination && (
          <div className="mt-3">
            <AiSuggestPanel
              label="Suggestions de visites"
              system="Tu es un guide de voyage. Réponds uniquement par une liste numérotée de 6 à 10 lieux, activités ou visites incontournables pour cette destination, en français, sans introduction ni conclusion."
              prompt={`Destination : ${t.destination}${t.startDate || t.endDate ? `\nDates : ${fmtDateRange(t.startDate, t.endDate)}` : ''}\nPropose des lieux et activités à visiter sur place.`}
              applyLabel="Ajouter à ma liste"
              onApply={(items) => handleAddChecklistItems(t, items)}
            />
          </div>
        )}

        <button
          onClick={() => setExpandedId(expanded ? null : t.id)}
          className="mt-3 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Dépenses ({expenses.length}) {expanded ? '▲' : '▼'}
        </button>

        {expanded && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            {expenses.length === 0 && (
              <p className="mb-2 text-sm text-[var(--text-muted)]">Aucune dépense enregistrée.</p>
            )}
            <div className="mb-3 divide-y divide-[var(--border)]">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-sm">{e.label}</div>
                    {e.date && <div className="text-xs text-[var(--text-muted)]">{e.date}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm">{fmtEuro(e.amount)}</span>
                    <button
                      onClick={() => handleDeleteExpense(e)}
                      title="Supprimer"
                      className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={expenseDraft.label}
                onChange={(e) => setExpenseDraft({ ...expenseDraft, label: e.target.value })}
                placeholder="Libellé (ex: Hôtel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                value={expenseDraft.amount}
                onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: e.target.value })}
                placeholder="Montant (€)"
                inputMode="decimal"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                type="date"
                value={expenseDraft.date}
                onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
            </div>
            <button
              onClick={() => handleAddExpense(t.id)}
              disabled={saving}
              className="font-display mt-2 rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : '+ Ajouter la dépense'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Voyages</h2>
        <button
          onClick={() => setAddingTrip((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter un voyage
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingTrip && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={tripDraft.name}
              onChange={(e) => setTripDraft({ ...tripDraft, name: e.target.value })}
              placeholder="Nom (ex: Road trip Portugal)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={tripDraft.destination}
              onChange={(e) => setTripDraft({ ...tripDraft, destination: e.target.value })}
              placeholder="Destination (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={tripDraft.startDate}
              onChange={(e) => setTripDraft({ ...tripDraft, startDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              type="date"
              value={tripDraft.endDate}
              onChange={(e) => setTripDraft({ ...tripDraft, endDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={tripDraft.budget}
              onChange={(e) => setTripDraft({ ...tripDraft, budget: e.target.value })}
              placeholder="Budget (€, optionnel)"
              inputMode="decimal"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddTrip}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
            <button
              onClick={() => setAddingTrip(false)}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun voyage</h3>
          <p>Ajoute un voyage pour suivre son budget et ses dépenses.</p>
        </div>
      ) : (
        <div className="space-y-3">{trips.map((t) => renderTripCard(t, data))}</div>
      )}
    </div>
  )
}
