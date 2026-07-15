import { useState } from 'react'
import { useNotesData } from '../../lib/useNotesData'
import {
  buildNoteEdges,
  edgesForNote,
  fmtDate,
  otherNoteId,
  sortedNotes,
  toDateKey,
  type Note,
  type NoteSpace,
} from '../../lib/notes'
import { useAi } from '../../lib/useAi'
import { parseListItems } from '../../lib/aiText'
import ConstellationView from './ConstellationView'

type ViewMode = 'liste' | 'constellation'
type SpaceFilter = 'Tous' | NoteSpace

type Draft = { title: string; space: NoteSpace; tags: string; body: string }

const emptyDraft = (space: NoteSpace = 'Perso'): Draft => ({ title: '', space, tags: '', body: '' })

const parseTags = (raw: string): string[] =>
  [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))]

export default function NotesModule() {
  const { data, loading, error, saving, save } = useNotesData()
  const [view, setView] = useState<ViewMode>('liste')
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>('Tous')
  const [search, setSearch] = useState('')
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { ask, loading: aiLoading, error: aiError, hasKey } = useAi()
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const visibleNotes = sortedNotes(
    data.notes.filter((n) => {
      if (spaceFilter !== 'Tous' && n.space !== spaceFilter) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    }),
  )
  const edges = buildNoteEdges(visibleNotes)
  const selected = selectedId ? data.notes.find((n) => n.id === selectedId) ?? null : null

  async function handleAdd() {
    if (!data) return
    if (!draft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    setFormError(null)
    const today = toDateKey(new Date())
    const newNote: Note = {
      id: 'note_' + Math.random().toString(36).slice(2, 10),
      title: draft.title.trim(),
      body: draft.body,
      space: draft.space,
      tags: parseTags(draft.tags),
      createdAt: today,
      updatedAt: today,
    }
    await save({ notes: [...data.notes, newNote] }, `Notes: ajout de "${newNote.title}"`)
    setDraft(emptyDraft(draft.space))
    setAddingOpen(false)
  }

  function startEdit(n: Note) {
    setEditingId(n.id)
    setEditDraft({ title: n.title, space: n.space, tags: (n.tags ?? []).join(', '), body: n.body })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    setFormError(null)
    const nextNotes = data.notes.map((n) =>
      n.id === id
        ? {
            ...n,
            title: editDraft.title.trim(),
            space: editDraft.space,
            tags: parseTags(editDraft.tags),
            body: editDraft.body,
            updatedAt: toDateKey(new Date()),
          }
        : n,
    )
    await save({ notes: nextNotes }, `Notes: modification de "${editDraft.title}"`)
    setEditingId(null)
  }

  async function handleDelete(n: Note) {
    if (!data) return
    if (!window.confirm(`Supprimer "${n.title}" ? Cette action est irréversible.`)) return
    await save({ notes: data.notes.filter((x) => x.id !== n.id) }, `Notes: suppression de "${n.title}"`)
    if (selectedId === n.id) setSelectedId(null)
  }

  async function togglePinned(n: Note) {
    if (!data) return
    const nextNotes = data.notes.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x))
    await save({ notes: nextNotes }, `Notes: "${n.title}" ${n.pinned ? 'désépinglée' : 'épinglée'}`)
  }

  async function handleSuggestRelated(n: Note) {
    if (!data) return
    setAiSuggestions(null)
    const others = data.notes.filter((x) => x.id !== n.id)
    const catalog = others.map((o) => `- "${o.title}"${o.tags?.length ? ` [${o.tags.join(', ')}]` : ''} : ${o.body.slice(0, 140)}`).join('\n')
    const system =
      "Tu aides à relier des notes personnelles entre elles par pertinence de sens (pas juste des mots en commun). Réponds UNIQUEMENT avec les titres exacts (entre guillemets dans la liste ci-dessous) des notes conceptuellement liées à la note donnée, un titre par ligne, sans aucune explication. Si aucune note n'est vraiment liée, réponds \"aucune\"."
    const prompt = `Note à relier :\nTitre : ${n.title}\nContenu : ${n.body.slice(0, 500)}\n\nAutres notes disponibles :\n${catalog}\n\nQuelles notes de la liste sont vraiment liées par le sens à "${n.title}" ?`
    const text = await ask(prompt, system)
    if (!text) return
    const titles = parseListItems(text).map((t) => t.replace(/^"|"$/g, '').trim().toLowerCase())
    const matched = others.filter((o) => titles.includes(o.title.toLowerCase()))
    setAiSuggestions(matched.map((m) => m.id))
  }

  async function acceptSuggestion(noteId: string, suggestedId: string) {
    if (!data) return
    const note = data.notes.find((x) => x.id === noteId)
    if (!note) return
    const nextLinks = [...new Set([...(note.links ?? []), suggestedId])]
    const nextNotes = data.notes.map((x) => (x.id === noteId ? { ...x, links: nextLinks } : x))
    await save({ notes: nextNotes }, `Notes: lien ajouté sur "${note.title}"`)
    setAiSuggestions((s) => (s ? s.filter((id) => id !== suggestedId) : s))
  }

  function renderForm(d: Draft, setD: (d: Draft) => void, onSave: () => void, onCancel: () => void) {
    return (
      <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder="Titre"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <select
            value={d.space}
            onChange={(e) => setD({ ...d, space: e.target.value as NoteSpace })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
          >
            <option value="Perso">Perso</option>
            <option value="Pro">Pro</option>
          </select>
          <input
            value={d.tags}
            onChange={(e) => setD({ ...d, tags: e.target.value })}
            placeholder="Tags séparés par des virgules (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
          />
          <textarea
            value={d.body}
            onChange={(e) => setD({ ...d, body: e.target.value })}
            placeholder="Contenu — utilise [[Titre d'une autre note]] pour la relier directement"
            rows={5}
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

  function renderNoteCard(n: Note) {
    if (editingId === n.id) {
      return (
        <div key={n.id}>
          {renderForm(editDraft, setEditDraft, () => handleEditSave(n.id), () => setEditingId(null))}
        </div>
      )
    }
    const related = edgesForNote(buildNoteEdges(data!.notes), n.id).length
    return (
      <div key={n.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {n.title}
              <span
                className="rounded-full px-2 py-0.5 text-[10px] text-[#08090b]"
                style={{ background: n.space === 'Pro' ? '#5b8ef4' : 'var(--gold)' }}
              >
                {n.space}
              </span>
              {n.pinned && <span className="text-[var(--red)]">★</span>}
            </div>
            {n.tags && n.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {n.body && <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--text-muted)]">{n.body.slice(0, 220)}{n.body.length > 220 ? '…' : ''}</p>}
            <div className="mt-2 text-[10px] text-[var(--text-faint)]">
              Modifiée le {fmtDate(n.updatedAt)}
              {related > 0 ? ` · 🔗 ${related} note${related > 1 ? 's' : ''} liée${related > 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => togglePinned(n)}
              title={n.pinned ? 'Désépingler' : 'Épingler'}
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
            >
              {n.pinned ? '★' : '☆'}
            </button>
            <button
              onClick={() => startEdit(n)}
              title="Modifier"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              ✎
            </button>
            <button
              onClick={() => handleDelete(n)}
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
        <h2 className="font-display text-xl font-normal">Notes</h2>
        <button
          onClick={() => {
            setDraft(emptyDraft(spaceFilter === 'Pro' ? 'Pro' : 'Perso'))
            setAddingOpen((v) => !v)
          }}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['Tous', 'Perso', 'Pro'] as SpaceFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpaceFilter(s)}
              className={`font-display rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                spaceFilter === s ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['liste', 'constellation'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`font-display rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                view === v ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher dans les notes…"
        className="mb-4 w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
      />

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingOpen && renderForm(draft, setDraft, handleAdd, () => setAddingOpen(false))}

      {visibleNotes.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucune note</h3>
          <p>Ajoute ta première note — professionnelle ou personnelle — pour commencer ta constellation.</p>
        </div>
      ) : view === 'liste' ? (
        <div className="space-y-3">{visibleNotes.map(renderNoteCard)}</div>
      ) : (
        <div className="space-y-4">
          <ConstellationView notes={visibleNotes} edges={edges} selectedId={selectedId} onSelect={setSelectedId} />

          {selected && (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {selected.title}
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] text-[#08090b]"
                      style={{ background: selected.space === 'Pro' ? '#5b8ef4' : 'var(--gold)' }}
                    >
                      {selected.space}
                    </span>
                  </div>
                  {selected.body && <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--text-muted)]">{selected.body}</p>}
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                >
                  ✕
                </button>
              </div>

              {edgesForNote(edges, selected.id).length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Notes liées</div>
                  <div className="flex flex-wrap gap-1.5">
                    {edgesForNote(edges, selected.id).map((e) => {
                      const otherId = otherNoteId(e, selected.id)
                      const other = data!.notes.find((x) => x.id === otherId)
                      if (!other) return null
                      return (
                        <button
                          key={otherId}
                          onClick={() => setSelectedId(otherId)}
                          className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                        >
                          {other.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasKey && (
                <div className="mt-3">
                  <button
                    onClick={() => handleSuggestRelated(selected)}
                    disabled={aiLoading}
                    className="font-display rounded-full border border-[var(--gold)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--gold)] disabled:opacity-40"
                  >
                    {aiLoading ? 'Réflexion…' : '✨ Suggérer des notes liées'}
                  </button>
                  {aiError && <p className="mt-2 text-xs text-[var(--red)]">{aiError}</p>}
                  {aiSuggestions && (
                    <div className="mt-2 space-y-1.5">
                      {aiSuggestions.length === 0 ? (
                        <p className="text-xs text-[var(--text-faint)]">Aucune note conceptuellement liée trouvée.</p>
                      ) : (
                        aiSuggestions.map((id) => {
                          const other = data!.notes.find((x) => x.id === id)
                          if (!other) return null
                          return (
                            <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs">
                              <span>{other.title}</span>
                              <button
                                onClick={() => acceptSuggestion(selected.id, id)}
                                className="font-display shrink-0 rounded-full bg-[var(--gold)] px-2.5 py-1 text-[10px] font-semibold text-[#1a1408]"
                              >
                                Lier
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
