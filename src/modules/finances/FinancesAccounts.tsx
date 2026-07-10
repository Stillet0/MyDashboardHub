import { useState } from 'react'
import { categoryColor, fmtMoney, type Account, type FinancesData } from '../../lib/finances'

type Props = {
  data: FinancesData
  saving: boolean
  onSave: (next: FinancesData, message: string) => Promise<void>
}

type Draft = { name: string; category: string; value: string }

const emptyDraft = (defaultCategory: string): Draft => ({ name: '', category: defaultCategory, value: '' })

export default function FinancesAccounts({ data, saving, onSave }: Props) {
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(data.categories[0]?.name ?? ''))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft(''))
  const [error, setError] = useState<string | null>(null)

  const grouped = new Map<string, Account[]>()
  data.accounts.forEach((acc) => {
    const list = grouped.get(acc.category) ?? []
    list.push(acc)
    grouped.set(acc.category, list)
  })

  async function handleAdd() {
    const value = Number(draft.value.replace(',', '.'))
    if (!draft.name.trim() || !draft.category || Number.isNaN(value)) {
      setError('Nom, catégorie et valeur sont requis.')
      return
    }
    setError(null)
    const newAccount: Account = {
      id: 'acc_' + Math.random().toString(36).slice(2, 10),
      name: draft.name.trim(),
      category: draft.category,
      value,
    }
    await onSave(
      { ...data, accounts: [...data.accounts, newAccount] },
      `Finances: ajout du compte "${newAccount.name}"`,
    )
    setDraft(emptyDraft(data.categories[0]?.name ?? ''))
    setAddingOpen(false)
  }

  function startEdit(acc: Account) {
    setEditingId(acc.id)
    setEditDraft({ name: acc.name, category: acc.category, value: String(acc.value) })
    setError(null)
  }

  async function handleEditSave(id: string) {
    const value = Number(editDraft.value.replace(',', '.'))
    if (!editDraft.name.trim() || !editDraft.category || Number.isNaN(value)) {
      setError('Nom, catégorie et valeur sont requis.')
      return
    }
    setError(null)
    const nextAccounts = data.accounts.map((a) =>
      a.id === id ? { ...a, name: editDraft.name.trim(), category: editDraft.category, value } : a,
    )
    await onSave({ ...data, accounts: nextAccounts }, `Finances: modification du compte "${editDraft.name}"`)
    setEditingId(null)
  }

  async function handleDelete(acc: Account) {
    if (!window.confirm(`Supprimer le compte "${acc.name}" ? Cette action est irréversible.`)) return
    await onSave(
      { ...data, accounts: data.accounts.filter((a) => a.id !== acc.id) },
      `Finances: suppression du compte "${acc.name}"`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Vos comptes</h2>
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
              placeholder="Nom (ex: Livret A)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              {data.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              placeholder="Valeur (€)"
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

      {data.accounts.length === 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun compte</h3>
          <p>Créez votre premier compte : livret, PEA, bien immobilier, portefeuille crypto…</p>
        </div>
      )}

      {[...grouped.entries()].map(([cat, accs]) => {
        const color = categoryColor(data, cat)
        return (
          <div key={cat} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-3 text-sm font-medium text-[var(--text-muted)]">{cat}</div>
            <div className="divide-y divide-[var(--border)]">
              {accs.map((acc) =>
                editingId === acc.id ? (
                  <div key={acc.id} className="py-3.5">
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
                        {data.categories.map((c) => (
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
                        onClick={() => handleEditSave(acc.id)}
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
                  <div key={acc.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                      <div>
                        <div className="text-sm font-medium">{acc.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{acc.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display mr-1 text-sm text-[var(--text-muted)]">
                        {fmtMoney(acc.value)}
                      </span>
                      <button
                        onClick={() => startEdit(acc)}
                        title="Modifier"
                        className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(acc)}
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
