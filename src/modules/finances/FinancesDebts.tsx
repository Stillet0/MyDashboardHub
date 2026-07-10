import { useState } from 'react'
import { debtCategoryColor, fmtMoney, type Debt, type FinancesData } from '../../lib/finances'

type Props = {
  data: FinancesData
  saving: boolean
  onSave: (next: FinancesData, message: string) => Promise<void>
}

type Draft = { name: string; category: string; value: string }

const emptyDraft = (defaultCategory: string): Draft => ({ name: '', category: defaultCategory, value: '' })

export default function FinancesDebts({ data, saving, onSave }: Props) {
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(data.debtCategories[0]?.name ?? ''))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft(''))
  const [error, setError] = useState<string | null>(null)

  const grouped = new Map<string, Debt[]>()
  data.debts.forEach((d) => {
    const list = grouped.get(d.category) ?? []
    list.push(d)
    grouped.set(d.category, list)
  })

  async function handleAdd() {
    const value = Number(draft.value.replace(',', '.'))
    if (!draft.name.trim() || !draft.category || Number.isNaN(value)) {
      setError('Nom, catégorie et solde sont requis.')
      return
    }
    setError(null)
    const newDebt: Debt = {
      id: 'debt_' + Math.random().toString(36).slice(2, 10),
      name: draft.name.trim(),
      category: draft.category,
      value,
    }
    await onSave({ ...data, debts: [...data.debts, newDebt] }, `Finances: ajout de la dette "${newDebt.name}"`)
    setDraft(emptyDraft(data.debtCategories[0]?.name ?? ''))
    setAddingOpen(false)
  }

  function startEdit(d: Debt) {
    setEditingId(d.id)
    setEditDraft({ name: d.name, category: d.category, value: String(d.value) })
    setError(null)
  }

  async function handleEditSave(id: string) {
    const value = Number(editDraft.value.replace(',', '.'))
    if (!editDraft.name.trim() || !editDraft.category || Number.isNaN(value)) {
      setError('Nom, catégorie et solde sont requis.')
      return
    }
    setError(null)
    const nextDebts = data.debts.map((d) =>
      d.id === id ? { ...d, name: editDraft.name.trim(), category: editDraft.category, value } : d,
    )
    await onSave({ ...data, debts: nextDebts }, `Finances: modification de la dette "${editDraft.name}"`)
    setEditingId(null)
  }

  async function handleDelete(d: Debt) {
    if (!window.confirm(`Supprimer la dette "${d.name}" ? Cette action est irréversible.`)) return
    await onSave(
      { ...data, debts: data.debts.filter((x) => x.id !== d.id) },
      `Finances: suppression de la dette "${d.name}"`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Vos dettes</h2>
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      {error && <p className="text-sm text-[var(--red)]">{error}</p>}

      {addingOpen && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nom (ex: Crédit immobilier)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              {data.debtCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              placeholder="Solde restant (€)"
              inputMode="decimal"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
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

      {data.debts.length === 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucune dette enregistrée</h3>
          <p>
            Crédit immobilier, prêt étudiant, prêt conso… ajoutez-les pour connaître votre patrimoine net
            (actifs − dettes), pas seulement brut.
          </p>
        </div>
      )}

      {[...grouped.entries()].map(([cat, debts]) => {
        const color = debtCategoryColor(data, cat)
        return (
          <div key={cat} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">{cat}</div>
            <div className="divide-y divide-[var(--border)]">
              {debts.map((d) =>
                editingId === d.id ? (
                  <div key={d.id} className="py-3.5">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <select
                        value={editDraft.category}
                        onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      >
                        {data.debtCategories.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={editDraft.value}
                        onChange={(e) => setEditDraft({ ...editDraft, value: e.target.value })}
                        inputMode="decimal"
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleEditSave(d.id)}
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
                ) : (
                  <div key={d.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                      <div>
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{d.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display mr-1 text-sm text-[var(--text-muted)]">
                        {fmtMoney(d.value)}
                      </span>
                      <button
                        onClick={() => startEdit(d)}
                        title="Modifier"
                        className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        title="Supprimer"
                        className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
