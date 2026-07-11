import { useState } from 'react'
import { useGoalsData } from '../../lib/useGoalsData'
import { fmtDate, isOverdue, sortedGoals, LINKED_MODULES, type Goal, type LinkedModule } from '../../lib/goals'
import { newChecklistItem } from '../../lib/checklist'
import AiSuggestPanel from '../../components/AiSuggestPanel'

type Draft = {
  title: string
  description: string
  targetDate: string
  linkedModule: LinkedModule | ''
  progress: string
}

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  targetDate: '',
  linkedModule: '',
  progress: '0',
})

export default function GoalsModule() {
  const { data, loading, error, saving, save } = useGoalsData()
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft())
  const [showDone, setShowDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const sorted = sortedGoals(data.goals)
  const active = sorted.filter((g) => !g.done)
  const done = sorted.filter((g) => g.done)

  async function handleAdd() {
    if (!data) return
    if (!draft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    const progress = Math.min(100, Math.max(0, Number(draft.progress) || 0))
    setFormError(null)
    const newGoal: Goal = {
      id: 'goal_' + Math.random().toString(36).slice(2, 10),
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      targetDate: draft.targetDate || undefined,
      linkedModule: draft.linkedModule || undefined,
      progress,
      done: progress >= 100,
    }
    await save({ goals: [...data.goals, newGoal] }, `Objectifs: ajout de "${newGoal.title}"`)
    setDraft(emptyDraft())
    setAddingOpen(false)
  }

  function startEdit(g: Goal) {
    setEditingId(g.id)
    setEditDraft({
      title: g.title,
      description: g.description ?? '',
      targetDate: g.targetDate ?? '',
      linkedModule: g.linkedModule ?? '',
      progress: String(g.progress),
    })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    const progress = Math.min(100, Math.max(0, Number(editDraft.progress) || 0))
    setFormError(null)
    const nextGoals = data.goals.map((g) =>
      g.id === id
        ? {
            ...g,
            title: editDraft.title.trim(),
            description: editDraft.description.trim() || undefined,
            targetDate: editDraft.targetDate || undefined,
            linkedModule: editDraft.linkedModule || undefined,
            progress,
            done: progress >= 100,
          }
        : g,
    )
    await save({ goals: nextGoals }, `Objectifs: modification de "${editDraft.title}"`)
    setEditingId(null)
  }

  async function handleDelete(g: Goal) {
    if (!data) return
    if (!window.confirm(`Supprimer "${g.title}" ? Cette action est irréversible.`)) return
    await save({ goals: data.goals.filter((x) => x.id !== g.id) }, `Objectifs: suppression de "${g.title}"`)
  }

  async function handleAddSteps(g: Goal, items: string[]) {
    if (!data || items.length === 0) return
    const newItems = items.map((text) => newChecklistItem(text))
    const nextGoals = data.goals.map((x) =>
      x.id === g.id ? { ...x, steps: [...(x.steps ?? []), ...newItems] } : x,
    )
    await save({ goals: nextGoals }, `Objectifs: plan d'action IA ajouté à "${g.title}"`)
  }

  async function toggleStep(g: Goal, stepId: string) {
    if (!data) return
    const nextGoals = data.goals.map((x) =>
      x.id === g.id
        ? { ...x, steps: (x.steps ?? []).map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) }
        : x,
    )
    await save({ goals: nextGoals }, `Objectifs: étape mise à jour`)
  }

  async function removeStep(g: Goal, stepId: string) {
    if (!data) return
    const nextGoals = data.goals.map((x) =>
      x.id === g.id ? { ...x, steps: (x.steps ?? []).filter((s) => s.id !== stepId) } : x,
    )
    await save({ goals: nextGoals }, `Objectifs: étape supprimée`)
  }

  async function toggleDone(g: Goal) {
    if (!data) return
    const nextGoals = data.goals.map((x) =>
      x.id === g.id ? { ...x, done: !x.done, progress: !x.done ? 100 : x.progress } : x,
    )
    await save({ goals: nextGoals }, `Objectifs: "${g.title}" ${g.done ? 'rouvert' : 'atteint'}`)
  }

  function renderEditForm(id: string) {
    return (
      <div className="py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={editDraft.title}
            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <input
            value={editDraft.description}
            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
            placeholder="Description (optionnel)"
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
          />
          <select
            value={editDraft.linkedModule}
            onChange={(e) => setEditDraft({ ...editDraft, linkedModule: e.target.value as LinkedModule | '' })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          >
            <option value="">Aucun module lié</option>
            {LINKED_MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={editDraft.targetDate}
            onChange={(e) => setEditDraft({ ...editDraft, targetDate: e.target.value })}
            style={{ colorScheme: 'dark' }}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="range"
              min={0}
              max={100}
              value={editDraft.progress}
              onChange={(e) => setEditDraft({ ...editDraft, progress: e.target.value })}
              className="flex-1"
            />
            <span className="font-display w-12 text-right text-sm">{editDraft.progress}%</span>
          </div>
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

  function renderGoalRow(g: Goal) {
    if (editingId === g.id) return <div key={g.id}>{renderEditForm(g.id)}</div>
    const overdue = isOverdue(g)
    return (
      <div key={g.id} className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={() => toggleDone(g)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                g.done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
              }`}
              title={g.done ? 'Rouvrir' : 'Marquer comme atteint'}
            >
              {g.done && <span className="text-xs text-[#08090b]">✓</span>}
            </button>
            <div className="min-w-0">
              <div className={`text-sm font-medium ${g.done ? 'text-[var(--text-faint)] line-through' : ''}`}>
                {g.title}
              </div>
              {g.description && (
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">{g.description}</div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                {g.linkedModule && (
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px]">
                    {g.linkedModule}
                  </span>
                )}
                {g.targetDate && (
                  <span className={overdue ? 'text-[var(--red)]' : undefined}>
                    {overdue ? 'En retard · ' : ''}
                    {fmtDate(g.targetDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => startEdit(g)}
              title="Modifier"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              ✎
            </button>
            <button
              onClick={() => handleDelete(g)}
              title="Supprimer"
              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
            >
              ✕
            </button>
          </div>
        </div>
        {!g.done && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--gold)]"
                style={{ width: `${g.progress}%` }}
              />
            </div>
            <span className="font-display w-9 text-right text-xs text-[var(--text-muted)]">
              {g.progress}%
            </span>
          </div>
        )}

        {g.steps && g.steps.length > 0 && (
          <div className="mt-2.5 ml-8 space-y-1">
            {g.steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => toggleStep(g, s.id)}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    s.done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
                  }`}
                >
                  {s.done && <span className="text-[9px] text-[#08090b]">✓</span>}
                </button>
                <span className={`flex-1 ${s.done ? 'text-[var(--text-faint)] line-through' : 'text-[var(--text-muted)]'}`}>
                  {s.text}
                </span>
                <button onClick={() => removeStep(g, s.id)} className="text-[var(--text-faint)] hover:text-[var(--red)]">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!g.done && (
          <div className="mt-2.5 ml-8">
            <AiSuggestPanel
              label="Générer un plan d'action"
              system="Tu es un coach en planification d'objectifs. Réponds uniquement par une liste numérotée de 4 à 7 étapes concrètes et réalistes pour atteindre l'objectif, en français, sans introduction ni conclusion."
              prompt={`Objectif : ${g.title}${g.description ? `\nDescription : ${g.description}` : ''}${g.targetDate ? `\nÉchéance visée : ${fmtDate(g.targetDate)}` : ''}\nProgression actuelle : ${g.progress}%.\nPropose un plan d'action étape par étape.`}
              applyLabel="Ajouter au plan d'action"
              onApply={(items) => handleAddSteps(g, items)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-normal">Objectifs</h2>
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
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Titre (ex: Courir un semi-marathon)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Description (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <select
              value={draft.linkedModule}
              onChange={(e) => setDraft({ ...draft, linkedModule: e.target.value as LinkedModule | '' })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              <option value="">Aucun module lié</option>
              {LINKED_MODULES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draft.targetDate}
              onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="range"
                min={0}
                max={100}
                value={draft.progress}
                onChange={(e) => setDraft({ ...draft, progress: e.target.value })}
                className="flex-1"
              />
              <span className="font-display w-12 text-right text-sm">{draft.progress}%</span>
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

      {active.length === 0 && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun objectif en cours</h3>
          <p>Ajoute un objectif long terme, éventuellement lié à un autre module.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="divide-y divide-[var(--border)]">{active.map(renderGoalRow)}</div>
        </div>
      )}

      {done.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="mb-1 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Atteints ({done.length}) {showDone ? '▲' : '▼'}
          </button>
          {showDone && <div className="divide-y divide-[var(--border)]">{done.map(renderGoalRow)}</div>}
        </div>
      )}
    </div>
  )
}
