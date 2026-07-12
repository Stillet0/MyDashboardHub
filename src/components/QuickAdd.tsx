import { useState, type KeyboardEvent } from 'react'
import { hasGeminiKey } from '../lib/aiKey'
import { parseQuickAdd, type QuickAddResult } from '../lib/quickAdd'
import type { TasksData, Task } from '../lib/tasks'
import type { AgendaData, AgendaEvent } from '../lib/agenda'
import type { HealthData, Appointment } from '../lib/health'
import type { GoalsData, Goal } from '../lib/goals'
import type { DocumentsData, DocumentRef } from '../lib/documents'
import { fmtDueDate as fmtTaskDate } from '../lib/tasks'

type Props = {
  tasksData: TasksData | null
  saveTasks: (next: TasksData, message: string) => Promise<void>
  agendaData: AgendaData | null
  saveAgenda: (next: AgendaData, message: string) => Promise<void>
  healthData: HealthData | null
  saveHealth: (next: HealthData, message: string) => Promise<void>
  goalsData: GoalsData | null
  saveGoals: (next: GoalsData, message: string) => Promise<void>
  documentsData: DocumentsData | null
  saveDocuments: (next: DocumentsData, message: string) => Promise<void>
}

function summarize(r: QuickAddResult): { title: string; detail: string } {
  switch (r.module) {
    case 'Tâches':
      return {
        title: r.title,
        detail: [r.category, r.priority, r.dueDate ? fmtTaskDate(r.dueDate) : null].filter(Boolean).join(' · '),
      }
    case 'Agenda':
      return { title: r.title, detail: [fmtTaskDate(r.date), r.time, r.location].filter(Boolean).join(' · ') }
    case 'Santé':
      return { title: r.title, detail: [fmtTaskDate(r.date), r.time, r.practitioner].filter(Boolean).join(' · ') }
    case 'Objectifs':
      return { title: r.title, detail: r.targetDate ? fmtTaskDate(r.targetDate) : (r.description ?? '') }
    case 'Documents':
      return { title: r.name, detail: [r.category, r.expirationDate ? fmtTaskDate(r.expirationDate) : null].filter(Boolean).join(' · ') }
  }
}

export default function QuickAdd(props: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuickAddResult | null>(null)
  const [saving, setSaving] = useState(false)

  if (!hasGeminiKey()) return null

  async function handleAnalyze() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const parsed = await parseQuickAdd(text.trim())
      setResult(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur IA')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAnalyze()
  }

  async function handleConfirm() {
    if (!result) return
    setSaving(true)
    try {
      if (result.module === 'Tâches' && props.tasksData) {
        const newTask: Task = {
          id: 'task_' + Math.random().toString(36).slice(2, 10),
          title: result.title,
          category: props.tasksData.categories.some((c) => c.name === result.category) ? result.category : undefined,
          priority: result.priority ?? 'normale',
          dueDate: result.dueDate,
          done: false,
        }
        await props.saveTasks(
          { ...props.tasksData, tasks: [...props.tasksData.tasks, newTask] },
          `Tâches: ajout rapide "${newTask.title}"`,
        )
      } else if (result.module === 'Agenda' && props.agendaData) {
        const newEvent: AgendaEvent = {
          id: 'evt_' + Math.random().toString(36).slice(2, 10),
          title: result.title,
          date: result.date,
          time: result.time,
          location: result.location,
        }
        await props.saveAgenda(
          { ...props.agendaData, events: [...props.agendaData.events, newEvent] },
          `Agenda: ajout rapide "${newEvent.title}"`,
        )
      } else if (result.module === 'Santé' && props.healthData) {
        const newAppt: Appointment = {
          id: 'appt_' + Math.random().toString(36).slice(2, 10),
          title: result.title,
          date: result.date,
          time: result.time,
          practitioner: result.practitioner,
          done: false,
        }
        await props.saveHealth(
          { ...props.healthData, appointments: [...props.healthData.appointments, newAppt] },
          `Santé: ajout rapide "${newAppt.title}"`,
        )
      } else if (result.module === 'Objectifs' && props.goalsData) {
        const newGoal: Goal = {
          id: 'goal_' + Math.random().toString(36).slice(2, 10),
          title: result.title,
          description: result.description,
          targetDate: result.targetDate,
          progress: 0,
          done: false,
        }
        await props.saveGoals(
          { goals: [...props.goalsData.goals, newGoal] },
          `Objectifs: ajout rapide "${newGoal.title}"`,
        )
      } else if (result.module === 'Documents' && props.documentsData) {
        const newDoc: DocumentRef = {
          id: 'doc_' + Math.random().toString(36).slice(2, 10),
          name: result.name,
          category: props.documentsData.categories.some((c) => c.name === result.category) ? result.category : undefined,
          expirationDate: result.expirationDate,
        }
        await props.saveDocuments(
          { ...props.documentsData, documents: [...props.documentsData.documents, newDoc] },
          `Documents: ajout rapide "${newDoc.name}"`,
        )
      }
      setResult(null)
      setText('')
    } finally {
      setSaving(false)
    }
  }

  const preview = result ? summarize(result) : null

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">✨ Ajout rapide</div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ex : "Dentiste vendredi 15h" ou "Renouveler le passeport avant mars"'
          className="flex-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          className="font-display shrink-0 rounded-full bg-[var(--gold)] px-3 py-2 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
        >
          {loading ? 'Analyse…' : 'Analyser'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-[var(--red)]">{error}</p>}

      {result && preview && (
        <div className="mt-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="text-[10px] tracking-wide text-[var(--text-faint)] uppercase">{result.module}</div>
          <div className="text-sm font-medium">{preview.title}</div>
          {preview.detail && <div className="text-xs text-[var(--text-muted)]">{preview.detail}</div>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
            <button
              onClick={() => setResult(null)}
              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
