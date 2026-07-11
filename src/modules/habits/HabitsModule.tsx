import { useState } from 'react'
import { useHabitsData } from '../../lib/useHabitsData'
import {
  currentStreak,
  isDoneOn,
  isDoneThisPeriod,
  lastDays,
  todayKey,
  HABIT_COLORS,
  type Frequency,
  type Habit,
} from '../../lib/habits'

type Draft = { name: string; frequency: Frequency; color: string }

const emptyDraft = (): Draft => ({ name: '', frequency: 'quotidien', color: HABIT_COLORS[0] })

export default function HabitsModule() {
  const { data, loading, error, saving, save } = useHabitsData()
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  async function handleAdd() {
    if (!data) return
    if (!draft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const newHabit: Habit = {
      id: 'habit_' + Math.random().toString(36).slice(2, 10),
      name: draft.name.trim(),
      frequency: draft.frequency,
      color: draft.color,
      doneDates: [],
    }
    await save({ habits: [...data.habits, newHabit] }, `Habitudes: ajout de "${newHabit.name}"`)
    setDraft(emptyDraft())
    setAddingOpen(false)
  }

  function startEdit(h: Habit) {
    setEditingId(h.id)
    setEditDraft({ name: h.name, frequency: h.frequency, color: h.color })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const nextHabits = data.habits.map((h) =>
      h.id === id ? { ...h, name: editDraft.name.trim(), frequency: editDraft.frequency, color: editDraft.color } : h,
    )
    await save({ habits: nextHabits }, `Habitudes: modification de "${editDraft.name}"`)
    setEditingId(null)
  }

  async function handleDelete(h: Habit) {
    if (!data) return
    if (!window.confirm(`Supprimer "${h.name}" ? Cette action est irréversible.`)) return
    await save({ habits: data.habits.filter((x) => x.id !== h.id) }, `Habitudes: suppression de "${h.name}"`)
  }

  async function toggleToday(h: Habit) {
    if (!data) return
    const today = todayKey()
    const done = isDoneOn(h, today)
    const nextDoneDates = done ? h.doneDates.filter((d) => d !== today) : [...h.doneDates, today]
    const nextHabits = data.habits.map((x) => (x.id === h.id ? { ...x, doneDates: nextDoneDates } : x))
    await save({ habits: nextHabits }, `Habitudes: "${h.name}" ${done ? 'décochée' : 'cochée'} aujourd'hui`)
  }

  const days = lastDays(14)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Habitudes</h2>
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingOpen && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nom (ex: Méditer)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <select
              value={draft.frequency}
              onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Frequency })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              <option value="quotidien">Quotidien</option>
              <option value="hebdo">Hebdomadaire</option>
            </select>
            <div className="flex items-center gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={`h-7 w-7 rounded-full ${draft.color === c ? 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
            <button
              onClick={() => setAddingOpen(false)}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {data.habits.length === 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucune habitude</h3>
          <p>Ajoute une habitude à suivre au quotidien ou chaque semaine.</p>
        </div>
      )}

      <div className="space-y-3">
        {data.habits.map((h) => {
          if (editingId === h.id) {
            return (
              <div key={h.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
                  />
                  <select
                    value={editDraft.frequency}
                    onChange={(e) => setEditDraft({ ...editDraft, frequency: e.target.value as Frequency })}
                    className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                  >
                    <option value="quotidien">Quotidien</option>
                    <option value="hebdo">Hebdomadaire</option>
                  </select>
                  <div className="flex items-center gap-2">
                    {HABIT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditDraft({ ...editDraft, color: c })}
                        className={`h-7 w-7 rounded-full ${editDraft.color === c ? 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEditSave(h.id)}
                    disabled={saving}
                    className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )
          }

          const streak = currentStreak(h)
          const doneNow = isDoneThisPeriod(h)
          return (
            <div key={h.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.color }} />
                  <div>
                    <div className="text-sm font-medium">{h.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {h.frequency === 'quotidien' ? 'Quotidien' : 'Hebdomadaire'}
                      {streak > 0 && (
                        <span className="ml-2 text-[var(--gold)]">
                          🔥 {streak} {h.frequency === 'quotidien' ? 'jours' : 'semaines'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleToday(h)}
                    disabled={saving}
                    className={`font-display rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      doneNow
                        ? 'bg-[var(--emerald)] text-[#08090b]'
                        : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
                    }`}
                  >
                    {doneNow ? '✓ Fait' : h.frequency === 'quotidien' ? "Fait aujourd'hui" : 'Fait cette semaine'}
                  </button>
                  <button
                    onClick={() => startEdit(h)}
                    title="Modifier"
                    className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(h)}
                    title="Supprimer"
                    className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {days.map((d) => (
                  <div
                    key={d}
                    title={d}
                    className="h-4 flex-1 rounded-sm"
                    style={{ background: isDoneOn(h, d) ? h.color : 'var(--surface-2)' }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
