import { useState } from 'react'
import { useHealthData } from '../../lib/useHealthData'
import {
  daysUntil,
  fmtDate,
  isOverdue,
  renewalIsOverdue,
  renewalIsSoon,
  sortedAppointments,
  sortedTreatments,
  type Appointment,
  type Treatment,
} from '../../lib/health'

type ApptDraft = { title: string; practitioner: string; date: string; time: string; notes: string }
type TreatmentDraft = { name: string; dosage: string; ongoing: boolean; renewalDate: string; notes: string }

const emptyApptDraft = (): ApptDraft => ({ title: '', practitioner: '', date: '', time: '', notes: '' })
const emptyTreatmentDraft = (): TreatmentDraft => ({ name: '', dosage: '', ongoing: true, renewalDate: '', notes: '' })

export default function HealthModule() {
  const { data, loading, error, saving, save } = useHealthData()
  const [addingAppt, setAddingAppt] = useState(false)
  const [apptDraft, setApptDraft] = useState<ApptDraft>(emptyApptDraft())
  const [editingApptId, setEditingApptId] = useState<string | null>(null)
  const [apptEditDraft, setApptEditDraft] = useState<ApptDraft>(emptyApptDraft())
  const [showDoneAppts, setShowDoneAppts] = useState(false)

  const [addingTreatment, setAddingTreatment] = useState(false)
  const [treatmentDraft, setTreatmentDraft] = useState<TreatmentDraft>(emptyTreatmentDraft())
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null)
  const [treatmentEditDraft, setTreatmentEditDraft] = useState<TreatmentDraft>(emptyTreatmentDraft())

  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const appts = sortedAppointments(data.appointments)
  const upcomingAppts = appts.filter((a) => !a.done)
  const doneAppts = appts.filter((a) => a.done)
  const treatments = sortedTreatments(data.treatments)

  // --- Rendez-vous ---

  async function handleAddAppt() {
    if (!data) return
    if (!apptDraft.title.trim() || !apptDraft.date) {
      setFormError('Le titre et la date sont requis.')
      return
    }
    setFormError(null)
    const newAppt: Appointment = {
      id: 'appt_' + Math.random().toString(36).slice(2, 10),
      title: apptDraft.title.trim(),
      practitioner: apptDraft.practitioner.trim() || undefined,
      date: apptDraft.date,
      time: apptDraft.time || undefined,
      notes: apptDraft.notes.trim() || undefined,
      done: false,
    }
    await save({ ...data, appointments: [...data.appointments, newAppt] }, `Santé: rendez-vous "${newAppt.title}" ajouté`)
    setAddingAppt(false)
    setApptDraft(emptyApptDraft())
  }

  function startEditAppt(a: Appointment) {
    setEditingApptId(a.id)
    setApptEditDraft({
      title: a.title,
      practitioner: a.practitioner ?? '',
      date: a.date,
      time: a.time ?? '',
      notes: a.notes ?? '',
    })
    setFormError(null)
  }

  async function handleEditApptSave(id: string) {
    if (!data) return
    if (!apptEditDraft.title.trim() || !apptEditDraft.date) {
      setFormError('Le titre et la date sont requis.')
      return
    }
    setFormError(null)
    const next = data.appointments.map((a) =>
      a.id === id
        ? {
            ...a,
            title: apptEditDraft.title.trim(),
            practitioner: apptEditDraft.practitioner.trim() || undefined,
            date: apptEditDraft.date,
            time: apptEditDraft.time || undefined,
            notes: apptEditDraft.notes.trim() || undefined,
          }
        : a,
    )
    await save({ ...data, appointments: next }, `Santé: rendez-vous "${apptEditDraft.title}" modifié`)
    setEditingApptId(null)
  }

  async function toggleApptDone(a: Appointment) {
    if (!data) return
    const next = data.appointments.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x))
    await save({ ...data, appointments: next }, `Santé: rendez-vous "${a.title}" ${a.done ? 'rouvert' : 'passé'}`)
  }

  async function handleDeleteAppt(a: Appointment) {
    if (!data) return
    if (!window.confirm(`Supprimer le rendez-vous "${a.title}" ? Action irréversible.`)) return
    await save(
      { ...data, appointments: data.appointments.filter((x) => x.id !== a.id) },
      `Santé: rendez-vous "${a.title}" supprimé`,
    )
  }

  // --- Traitements ---

  async function handleAddTreatment() {
    if (!data) return
    if (!treatmentDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const newTreatment: Treatment = {
      id: 'trt_' + Math.random().toString(36).slice(2, 10),
      name: treatmentDraft.name.trim(),
      dosage: treatmentDraft.dosage.trim() || undefined,
      ongoing: treatmentDraft.ongoing,
      renewalDate: treatmentDraft.renewalDate || undefined,
      notes: treatmentDraft.notes.trim() || undefined,
    }
    await save({ ...data, treatments: [...data.treatments, newTreatment] }, `Santé: traitement "${newTreatment.name}" ajouté`)
    setAddingTreatment(false)
    setTreatmentDraft(emptyTreatmentDraft())
  }

  function startEditTreatment(t: Treatment) {
    setEditingTreatmentId(t.id)
    setTreatmentEditDraft({
      name: t.name,
      dosage: t.dosage ?? '',
      ongoing: t.ongoing,
      renewalDate: t.renewalDate ?? '',
      notes: t.notes ?? '',
    })
    setFormError(null)
  }

  async function handleEditTreatmentSave(id: string) {
    if (!data) return
    if (!treatmentEditDraft.name.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    setFormError(null)
    const next = data.treatments.map((t) =>
      t.id === id
        ? {
            ...t,
            name: treatmentEditDraft.name.trim(),
            dosage: treatmentEditDraft.dosage.trim() || undefined,
            ongoing: treatmentEditDraft.ongoing,
            renewalDate: treatmentEditDraft.renewalDate || undefined,
            notes: treatmentEditDraft.notes.trim() || undefined,
          }
        : t,
    )
    await save({ ...data, treatments: next }, `Santé: traitement "${treatmentEditDraft.name}" modifié`)
    setEditingTreatmentId(null)
  }

  async function handleDeleteTreatment(t: Treatment) {
    if (!data) return
    if (!window.confirm(`Supprimer "${t.name}" ? Action irréversible.`)) return
    await save(
      { ...data, treatments: data.treatments.filter((x) => x.id !== t.id) },
      `Santé: traitement "${t.name}" supprimé`,
    )
  }

  function renderApptRow(a: Appointment) {
    if (editingApptId === a.id) {
      return (
        <div key={a.id} className="py-3.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={apptEditDraft.title}
              onChange={(e) => setApptEditDraft({ ...apptEditDraft, title: e.target.value })}
              placeholder="Titre (ex: Dentiste - contrôle)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={apptEditDraft.practitioner}
              onChange={(e) => setApptEditDraft({ ...apptEditDraft, practitioner: e.target.value })}
              placeholder="Praticien (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={apptEditDraft.date}
              onChange={(e) => setApptEditDraft({ ...apptEditDraft, date: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              type="time"
              value={apptEditDraft.time}
              onChange={(e) => setApptEditDraft({ ...apptEditDraft, time: e.target.value })}
              style={{ colorScheme: 'dark' }}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={apptEditDraft.notes}
              onChange={(e) => setApptEditDraft({ ...apptEditDraft, notes: e.target.value })}
              placeholder="Notes (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleEditApptSave(a.id)}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditingApptId(null)}
              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )
    }
    const overdue = isOverdue(a)
    return (
      <div key={a.id} className="flex items-center justify-between gap-3 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => toggleApptDone(a)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              a.done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
            }`}
            title={a.done ? 'Rouvrir' : 'Marquer comme passé'}
          >
            {a.done && <span className="text-xs text-[#08090b]">✓</span>}
          </button>
          <div className="min-w-0">
            <div className={`text-sm font-medium ${a.done ? 'text-[var(--text-faint)] line-through' : ''}`}>
              {a.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              {a.practitioner && <span>{a.practitioner}</span>}
              <span className={overdue ? 'text-[var(--red)]' : undefined}>
                {overdue ? 'En retard · ' : ''}
                {fmtDate(a.date)}
                {a.time ? ` à ${a.time}` : ''}
              </span>
              {a.notes && <span className="text-[var(--text-faint)]">{a.notes}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => startEditAppt(a)}
            title="Modifier"
            className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            ✎
          </button>
          <button
            onClick={() => handleDeleteAppt(a)}
            title="Supprimer"
            className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  function renderTreatmentRow(t: Treatment) {
    if (editingTreatmentId === t.id) {
      return (
        <div key={t.id} className="py-3.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={treatmentEditDraft.name}
              onChange={(e) => setTreatmentEditDraft({ ...treatmentEditDraft, name: e.target.value })}
              placeholder="Nom du traitement"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              value={treatmentEditDraft.dosage}
              onChange={(e) => setTreatmentEditDraft({ ...treatmentEditDraft, dosage: e.target.value })}
              placeholder="Posologie (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
            <input
              type="date"
              value={treatmentEditDraft.renewalDate}
              onChange={(e) => setTreatmentEditDraft({ ...treatmentEditDraft, renewalDate: e.target.value })}
              style={{ colorScheme: 'dark' }}
              placeholder="Renouvellement (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={treatmentEditDraft.ongoing}
                onChange={(e) => setTreatmentEditDraft({ ...treatmentEditDraft, ongoing: e.target.checked })}
              />
              En cours
            </label>
            <input
              value={treatmentEditDraft.notes}
              onChange={(e) => setTreatmentEditDraft({ ...treatmentEditDraft, notes: e.target.value })}
              placeholder="Notes (optionnel)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleEditTreatmentSave(t.id)}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditingTreatmentId(null)}
              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )
    }
    const overdue = renewalIsOverdue(t)
    const soon = renewalIsSoon(t)
    return (
      <div key={t.id} className="flex items-center justify-between gap-3 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${t.ongoing ? 'bg-[var(--emerald)]' : 'bg-[var(--surface-2)]'}`}
            />
            {t.name}
            {t.dosage && <span className="text-xs font-normal text-[var(--text-muted)]">· {t.dosage}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{t.ongoing ? 'En cours' : 'Arrêté'}</span>
            {t.renewalDate && (
              <span className={overdue ? 'text-[var(--red)]' : soon ? 'text-[var(--gold)]' : undefined}>
                {overdue
                  ? `Renouvellement en retard (${fmtDate(t.renewalDate)})`
                  : soon
                    ? `À renouveler dans ${daysUntil(t.renewalDate)} j`
                    : `Renouvellement le ${fmtDate(t.renewalDate)}`}
              </span>
            )}
            {t.notes && <span className="text-[var(--text-faint)]">{t.notes}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => startEditTreatment(t)}
            title="Modifier"
            className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            ✎
          </button>
          <button
            onClick={() => handleDeleteTreatment(t)}
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
        <h2 className="font-display text-xl font-normal">Santé</h2>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base font-medium">Rendez-vous</h3>
          <button
            onClick={() => setAddingAppt((v) => !v)}
            className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
          >
            + Ajouter
          </button>
        </div>

        {addingAppt && (
          <div className="mb-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={apptDraft.title}
                onChange={(e) => setApptDraft({ ...apptDraft, title: e.target.value })}
                placeholder="Titre (ex: Dentiste - contrôle)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
              <input
                value={apptDraft.practitioner}
                onChange={(e) => setApptDraft({ ...apptDraft, practitioner: e.target.value })}
                placeholder="Praticien (optionnel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
              <input
                type="date"
                value={apptDraft.date}
                onChange={(e) => setApptDraft({ ...apptDraft, date: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                type="time"
                value={apptDraft.time}
                onChange={(e) => setApptDraft({ ...apptDraft, time: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                value={apptDraft.notes}
                onChange={(e) => setApptDraft({ ...apptDraft, notes: e.target.value })}
                placeholder="Notes (optionnel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAddAppt}
                disabled={saving}
                className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
              >
                {saving ? 'Enregistrement…' : 'Créer'}
              </button>
              <button
                onClick={() => setAddingAppt(false)}
                className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {upcomingAppts.length === 0 && doneAppts.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">Aucun rendez-vous enregistré.</p>
        ) : (
          <>
            {upcomingAppts.length === 0 && (
              <p className="py-2 text-sm text-[var(--text-muted)]">Aucun rendez-vous à venir.</p>
            )}
            <div className="divide-y divide-[var(--border)]">{upcomingAppts.map(renderApptRow)}</div>
            {doneAppts.length > 0 && (
              <div className="mt-1 border-t border-[var(--border)] pt-2">
                <button
                  onClick={() => setShowDoneAppts((v) => !v)}
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Passés ({doneAppts.length}) {showDoneAppts ? '▲' : '▼'}
                </button>
                {showDoneAppts && <div className="divide-y divide-[var(--border)]">{doneAppts.map(renderApptRow)}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base font-medium">Traitements</h3>
          <button
            onClick={() => setAddingTreatment((v) => !v)}
            className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
          >
            + Ajouter
          </button>
        </div>

        {addingTreatment && (
          <div className="mb-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={treatmentDraft.name}
                onChange={(e) => setTreatmentDraft({ ...treatmentDraft, name: e.target.value })}
                placeholder="Nom du traitement"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
              <input
                value={treatmentDraft.dosage}
                onChange={(e) => setTreatmentDraft({ ...treatmentDraft, dosage: e.target.value })}
                placeholder="Posologie (optionnel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
              <input
                type="date"
                value={treatmentDraft.renewalDate}
                onChange={(e) => setTreatmentDraft({ ...treatmentDraft, renewalDate: e.target.value })}
                style={{ colorScheme: 'dark' }}
                placeholder="Renouvellement (optionnel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
              />
              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={treatmentDraft.ongoing}
                  onChange={(e) => setTreatmentDraft({ ...treatmentDraft, ongoing: e.target.checked })}
                />
                En cours
              </label>
              <input
                value={treatmentDraft.notes}
                onChange={(e) => setTreatmentDraft({ ...treatmentDraft, notes: e.target.value })}
                placeholder="Notes (optionnel)"
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)] sm:col-span-2"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAddTreatment}
                disabled={saving}
                className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
              >
                {saving ? 'Enregistrement…' : 'Créer'}
              </button>
              <button
                onClick={() => setAddingTreatment(false)}
                className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {treatments.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">Aucun traitement enregistré.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">{treatments.map(renderTreatmentRow)}</div>
        )}
      </div>
    </div>
  )
}
