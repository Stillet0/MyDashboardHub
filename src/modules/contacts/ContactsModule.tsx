import { useState } from 'react'
import { useContactsData } from '../../lib/useContactsData'
import { useNotesData } from '../../lib/useNotesData'
import { ageTurning, daysUntil, fmtDate, nextBirthday, sortedContacts, type Contact } from '../../lib/contacts'
import LinkedNotesBadge from '../../components/LinkedNotesBadge'

type Draft = { name: string; relationship: string; birthday: string; giftIdeas: string; notes: string }

const emptyDraft = (): Draft => ({ name: '', relationship: '', birthday: '', giftIdeas: '', notes: '' })

function birthdayLabel(c: Contact): string | null {
  if (!c.birthday) return null
  const next = nextBirthday(c.birthday)
  if (!next) return null
  const days = daysUntil(next)
  const age = ageTurning(c.birthday, next)
  const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} j`
  return `🎂 ${when}${age ? ` (${age} ans)` : ''} · ${fmtDate(next)}`
}

type Props = { onNavigate?: (module: 'Notes') => void }

export default function ContactsModule({ onNavigate }: Props) {
  const { data, loading, error, saving, save } = useContactsData()
  const { data: notes } = useNotesData()
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

  const contacts = sortedContacts(data.contacts)

  async function handleAdd() {
    if (!data) return
    if (!draft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const newContact: Contact = {
      id: 'contact_' + Math.random().toString(36).slice(2, 10),
      name: draft.name.trim(),
      relationship: draft.relationship.trim() || undefined,
      birthday: draft.birthday || undefined,
      giftIdeas: draft.giftIdeas.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    }
    await save({ contacts: [...data.contacts, newContact] }, `Contacts: ajout de "${newContact.name}"`)
    setDraft(emptyDraft())
    setAddingOpen(false)
  }

  function startEdit(c: Contact) {
    setEditingId(c.id)
    setEditDraft({
      name: c.name,
      relationship: c.relationship ?? '',
      birthday: c.birthday ?? '',
      giftIdeas: c.giftIdeas ?? '',
      notes: c.notes ?? '',
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
    const nextContacts = data.contacts.map((c) =>
      c.id === id
        ? {
            ...c,
            name: editDraft.name.trim(),
            relationship: editDraft.relationship.trim() || undefined,
            birthday: editDraft.birthday || undefined,
            giftIdeas: editDraft.giftIdeas.trim() || undefined,
            notes: editDraft.notes.trim() || undefined,
          }
        : c,
    )
    await save({ contacts: nextContacts }, `Contacts: modification de "${editDraft.name}"`)
    setEditingId(null)
  }

  async function handleDelete(c: Contact) {
    if (!data) return
    if (!window.confirm(`Supprimer "${c.name}" ? Cette action est irréversible.`)) return
    await save({ contacts: data.contacts.filter((x) => x.id !== c.id) }, `Contacts: suppression de "${c.name}"`)
  }

  function renderForm(d: Draft, setD: (d: Draft) => void, onSave: () => void, onCancel: () => void) {
    return (
      <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            placeholder="Nom"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <input
            value={d.relationship}
            onChange={(e) => setD({ ...d, relationship: e.target.value })}
            placeholder="Relation (ex: Sœur, Ami, Collègue)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
          />
          <input
            type="date"
            value={d.birthday}
            onChange={(e) => setD({ ...d, birthday: e.target.value })}
            style={{ colorScheme: 'dark' }}
            placeholder="Anniversaire (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
          />
          <input
            value={d.giftIdeas}
            onChange={(e) => setD({ ...d, giftIdeas: e.target.value })}
            placeholder="Idées cadeaux (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <input
            value={d.notes}
            onChange={(e) => setD({ ...d, notes: e.target.value })}
            placeholder="Notes (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            onClick={onCancel}
            className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  function renderContactCard(c: Contact) {
    if (editingId === c.id) {
      return <div key={c.id}>{renderForm(editDraft, setEditDraft, () => handleEditSave(c.id), () => setEditingId(null))}</div>
    }
    const bday = birthdayLabel(c)
    const soon = c.birthday ? daysUntil(nextBirthday(c.birthday)!) <= 7 : false
    return (
      <div key={c.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {c.name}
              {c.relationship && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {c.relationship}
                </span>
              )}
            </div>
            {bday && (
              <div className={`mt-1 text-xs ${soon ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>{bday}</div>
            )}
            {soon && c.giftIdeas && (
              <div className="mt-1 text-xs text-[var(--text-muted)]">🎁 Idées : {c.giftIdeas}</div>
            )}
            {soon && !c.giftIdeas && (
              <div className="mt-1 text-xs text-[var(--gold)]">🎁 Pense à un cadeau</div>
            )}
            {c.notes && <p className="mt-2 text-xs text-[var(--text-muted)]">{c.notes}</p>}
            <div className="mt-2">
              <LinkedNotesBadge notes={notes?.notes} module="Contacts" itemId={c.id} onNavigate={onNavigate} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => startEdit(c)}
              title="Modifier"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              ✎
            </button>
            <button
              onClick={() => handleDelete(c)}
              title="Supprimer"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-normal">Contacts</h2>
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingOpen && renderForm(draft, setDraft, handleAdd, () => setAddingOpen(false))}

      {contacts.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun contact</h3>
          <p>Ajoute les personnes importantes — anniversaires, idées cadeaux — pour ne plus rien oublier.</p>
        </div>
      ) : (
        <div className="space-y-3">{contacts.map(renderContactCard)}</div>
      )}
    </div>
  )
}
