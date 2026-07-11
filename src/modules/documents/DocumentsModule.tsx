import { useState } from 'react'
import { useDocumentsData } from '../../lib/useDocumentsData'
import {
  categoryColor,
  daysUntil,
  fmtDate,
  isExpired,
  isExpiringSoon,
  sortedDocuments,
  type DocumentRef,
} from '../../lib/documents'

type Draft = { name: string; category: string; expirationDate: string; notes: string }

const emptyDraft = (defaultCategory: string): Draft => ({
  name: '',
  category: defaultCategory,
  expirationDate: '',
  notes: '',
})

export default function DocumentsModule() {
  const { data, loading, error, saving, save } = useDocumentsData()
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft(''))
  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const docs = sortedDocuments(data.documents)

  function openAdd() {
    setDraft(emptyDraft(data!.categories[0]?.name ?? ''))
    setAddingOpen(true)
  }

  async function handleAdd() {
    if (!data || !draft) return
    if (!draft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const newDoc: DocumentRef = {
      id: 'doc_' + Math.random().toString(36).slice(2, 10),
      name: draft.name.trim(),
      category: draft.category || undefined,
      expirationDate: draft.expirationDate || undefined,
      notes: draft.notes.trim() || undefined,
    }
    await save({ ...data, documents: [...data.documents, newDoc] }, `Documents: ajout de "${newDoc.name}"`)
    setAddingOpen(false)
    setDraft(null)
  }

  function startEdit(d: DocumentRef) {
    setEditingId(d.id)
    setEditDraft({
      name: d.name,
      category: d.category ?? '',
      expirationDate: d.expirationDate ?? '',
      notes: d.notes ?? '',
    })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const nextDocs = data.documents.map((d) =>
      d.id === id
        ? {
            ...d,
            name: editDraft.name.trim(),
            category: editDraft.category || undefined,
            expirationDate: editDraft.expirationDate || undefined,
            notes: editDraft.notes.trim() || undefined,
          }
        : d,
    )
    await save({ ...data, documents: nextDocs }, `Documents: modification de "${editDraft.name}"`)
    setEditingId(null)
  }

  async function handleDelete(d: DocumentRef) {
    if (!data) return
    if (!window.confirm(`Supprimer "${d.name}" ? Cette action est irréversible.`)) return
    await save(
      { ...data, documents: data.documents.filter((x) => x.id !== d.id) },
      `Documents: suppression de "${d.name}"`,
    )
  }

  function renderEditForm(id: string) {
    return (
      <div className="py-3.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={editDraft.name}
            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <select
            value={editDraft.category}
            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          >
            <option value="">Sans catégorie</option>
            {data!.categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={editDraft.expirationDate}
            onChange={(e) => setEditDraft({ ...editDraft, expirationDate: e.target.value })}
            style={{ colorScheme: 'dark' }}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          />
          <input
            value={editDraft.notes}
            onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
            placeholder="Notes (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleEditSave(id)}
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

  function renderDocRow(d: DocumentRef) {
    if (editingId === d.id) return <div key={d.id}>{renderEditForm(d.id)}</div>
    const expired = isExpired(d)
    const soon = isExpiringSoon(d)
    return (
      <div key={d.id} className="flex items-center justify-between gap-3 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {d.category && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: categoryColor(data!, d.category) }}
              />
            )}
            {d.name}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            {d.category && <span>{d.category}</span>}
            {d.expirationDate && (
              <span
                className={expired ? 'text-[var(--red)]' : soon ? 'text-[var(--gold)]' : undefined}
              >
                {expired
                  ? `Expiré depuis le ${fmtDate(d.expirationDate)}`
                  : soon
                    ? `Expire dans ${daysUntil(d.expirationDate)} j · ${fmtDate(d.expirationDate)}`
                    : `Expire le ${fmtDate(d.expirationDate)}`}
              </span>
            )}
            {d.notes && <span className="text-[var(--text-faint)]">{d.notes}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Documents</h2>
        <button
          onClick={openAdd}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingOpen && draft && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nom (ex: Passeport)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              <option value="">Sans catégorie</option>
              {data.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draft.expirationDate}
              onChange={(e) => setDraft({ ...draft, expirationDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              placeholder="Date d'expiration (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Notes (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
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

      {docs.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun document</h3>
          <p>Ajoute une référence importante : passeport, carte d'identité, assurance…</p>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="divide-y divide-[var(--border)]">{docs.map(renderDocRow)}</div>
        </div>
      )}
    </div>
  )
}
