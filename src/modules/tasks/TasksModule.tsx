import { useState } from 'react'
import { useTasksData } from '../../lib/useTasksData'
import {
  categoryColor,
  fmtDueDate,
  isOverdue,
  sortedTasks,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  type Priority,
  type Task,
} from '../../lib/tasks'

type Draft = { title: string; category: string; priority: Priority; dueDate: string; notes: string }

const emptyDraft = (defaultCategory: string): Draft => ({
  title: '',
  category: defaultCategory,
  priority: 'normale',
  dueDate: '',
  notes: '',
})

export default function TasksModule() {
  const { data, loading, error, saving, save } = useTasksData()
  const [addingOpen, setAddingOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft(''))
  const [showDone, setShowDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const sorted = sortedTasks(data.tasks)
  const todo = sorted.filter((t) => !t.done)
  const done = sorted.filter((t) => t.done)

  function openAdd() {
    setDraft(emptyDraft(data!.categories[0]?.name ?? ''))
    setAddingOpen(true)
  }

  async function handleAdd() {
    if (!data || !draft) return
    if (!draft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    setFormError(null)
    const newTask: Task = {
      id: 'task_' + Math.random().toString(36).slice(2, 10),
      title: draft.title.trim(),
      category: draft.category || undefined,
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      done: false,
      notes: draft.notes.trim() || undefined,
    }
    await save({ ...data, tasks: [...data.tasks, newTask] }, `Tâches: ajout de "${newTask.title}"`)
    setAddingOpen(false)
    setDraft(null)
  }

  async function toggleDone(task: Task) {
    if (!data) return
    const nextTasks = data.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    await save({ ...data, tasks: nextTasks }, `Tâches: "${task.title}" ${task.done ? 'rouverte' : 'terminée'}`)
  }

  function startEdit(t: Task) {
    setEditingId(t.id)
    setEditDraft({
      title: t.title,
      category: t.category ?? '',
      priority: t.priority,
      dueDate: t.dueDate ?? '',
      notes: t.notes ?? '',
    })
    setFormError(null)
  }

  async function handleEditSave(id: string) {
    if (!data) return
    if (!editDraft.title.trim()) {
      setFormError('Le titre est requis.')
      return
    }
    setFormError(null)
    const nextTasks = data.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            title: editDraft.title.trim(),
            category: editDraft.category || undefined,
            priority: editDraft.priority,
            dueDate: editDraft.dueDate || undefined,
            notes: editDraft.notes.trim() || undefined,
          }
        : t,
    )
    await save({ ...data, tasks: nextTasks }, `Tâches: modification de "${editDraft.title}"`)
    setEditingId(null)
  }

  async function handleDelete(t: Task) {
    if (!data) return
    if (!window.confirm(`Supprimer "${t.title}" ? Cette action est irréversible.`)) return
    await save({ ...data, tasks: data.tasks.filter((x) => x.id !== t.id) }, `Tâches: suppression de "${t.title}"`)
  }

  function renderEditForm(id: string) {
    return (
      <div className="py-3.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={editDraft.title}
            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
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
          <select
            value={editDraft.priority}
            onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value as Priority })}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
          >
            <option value="haute">Priorité haute</option>
            <option value="normale">Priorité normale</option>
            <option value="basse">Priorité basse</option>
          </select>
          <input
            type="date"
            value={editDraft.dueDate}
            onChange={(e) => setEditDraft({ ...editDraft, dueDate: e.target.value })}
            style={{ colorScheme: 'dark' }}
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

  function renderTaskRow(t: Task) {
    if (editingId === t.id) return <div key={t.id}>{renderEditForm(t.id)}</div>
    const overdue = isOverdue(t)
    return (
      <div key={t.id} className="flex items-center justify-between gap-3 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => toggleDone(t)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              t.done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
            }`}
            title={t.done ? 'Rouvrir' : 'Marquer comme terminée'}
          >
            {t.done && <span className="text-xs text-[#08090b]">✓</span>}
          </button>
          <div className="min-w-0">
            <div className={`text-sm font-medium ${t.done ? 'text-[var(--text-faint)] line-through' : ''}`}>
              {t.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              {t.category && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: categoryColor(data!, t.category) }}
                  />
                  {t.category}
                </span>
              )}
              {!t.done && (
                <span style={{ color: PRIORITY_COLOR[t.priority] }}>{PRIORITY_LABEL[t.priority]}</span>
              )}
              {t.dueDate && (
                <span className={overdue ? 'text-[var(--red)]' : undefined}>
                  {overdue ? 'En retard · ' : ''}
                  {fmtDueDate(t.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => startEdit(t)}
            title="Modifier"
            className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            ✎
          </button>
          <button
            onClick={() => handleDelete(t)}
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
        <h2 className="font-display text-xl font-normal">Tâches</h2>
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
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Titre"
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
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              <option value="haute">Priorité haute</option>
              <option value="normale">Priorité normale</option>
              <option value="basse">Priorité basse</option>
            </select>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
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

      {todo.length === 0 && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Rien à faire</h3>
          <p>Ajoute une tâche pour commencer.</p>
        </div>
      )}

      {todo.length > 0 && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="divide-y divide-[var(--border)]">{todo.map(renderTaskRow)}</div>
        </div>
      )}

      {done.length > 0 && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="mb-1 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Terminées ({done.length}) {showDone ? '▲' : '▼'}
          </button>
          {showDone && <div className="divide-y divide-[var(--border)]">{done.map(renderTaskRow)}</div>}
        </div>
      )}
    </div>
  )
}
