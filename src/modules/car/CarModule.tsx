import { useState } from 'react'
import { useCarData } from '../../lib/useCarData'
import {
  daysUntil,
  deadlinesForVehicle,
  fmtDate,
  fmtEuro,
  fmtKm,
  isDeadlineDone,
  isMaintenanceDone,
  isOverdue,
  logForVehicle,
  toDateKey,
  DEADLINE_PRESETS,
  type Deadline,
  type MaintenanceEntry,
  type Vehicle,
} from '../../lib/car'

type VehicleDraft = { name: string; currentMileage: string }
type DeadlineDraft = { label: string; dueDate: string; notes: string }
type LogDraft = { date: string; label: string; mileage: string; cost: string; notes: string; done: boolean }

const emptyVehicleDraft = (): VehicleDraft => ({ name: '', currentMileage: '' })
const emptyDeadlineDraft = (): DeadlineDraft => ({ label: DEADLINE_PRESETS[0], dueDate: '', notes: '' })
const emptyLogDraft = (): LogDraft => ({
  date: toDateKey(new Date()),
  label: '',
  mileage: '',
  cost: '',
  notes: '',
  done: true,
})

export default function CarModule() {
  const { data, loading, error, saving, save } = useCarData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [vehicleDraft, setVehicleDraft] = useState<VehicleDraft>(emptyVehicleDraft())
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [editVehicleDraft, setEditVehicleDraft] = useState<VehicleDraft>(emptyVehicleDraft())

  const [addingDeadline, setAddingDeadline] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState<DeadlineDraft>(emptyDeadlineDraft())
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null)
  const [editDeadlineDraft, setEditDeadlineDraft] = useState<DeadlineDraft>(emptyDeadlineDraft())

  const [addingLog, setAddingLog] = useState(false)
  const [logDraft, setLogDraft] = useState<LogDraft>(emptyLogDraft())

  const [formError, setFormError] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
        Chargement…
      </div>
    )
  }

  const selected = data.vehicles.find((v) => v.id === selectedId) ?? data.vehicles[0] ?? null

  async function handleAddVehicle() {
    if (!data) return
    const mileage = Number(vehicleDraft.currentMileage.replace(',', '.'))
    if (!vehicleDraft.name.trim() || Number.isNaN(mileage)) {
      setFormError('Nom et kilométrage sont requis.')
      return
    }
    setFormError(null)
    const newVehicle: Vehicle = {
      id: 'veh_' + Math.random().toString(36).slice(2, 10),
      name: vehicleDraft.name.trim(),
      currentMileage: mileage,
    }
    await save({ ...data, vehicles: [...data.vehicles, newVehicle] }, `Voiture: ajout de "${newVehicle.name}"`)
    setSelectedId(newVehicle.id)
    setVehicleDraft(emptyVehicleDraft())
    setAddingVehicle(false)
  }

  function startEditVehicle(v: Vehicle) {
    setEditingVehicleId(v.id)
    setEditVehicleDraft({ name: v.name, currentMileage: String(v.currentMileage) })
    setFormError(null)
  }

  async function handleEditVehicleSave(id: string) {
    if (!data) return
    const mileage = Number(editVehicleDraft.currentMileage.replace(',', '.'))
    if (!editVehicleDraft.name.trim() || Number.isNaN(mileage)) {
      setFormError('Nom et kilométrage sont requis.')
      return
    }
    setFormError(null)
    const nextVehicles = data.vehicles.map((v) =>
      v.id === id ? { ...v, name: editVehicleDraft.name.trim(), currentMileage: mileage } : v,
    )
    await save({ ...data, vehicles: nextVehicles }, `Voiture: modification de "${editVehicleDraft.name}"`)
    setEditingVehicleId(null)
  }

  async function handleDeleteVehicle(v: Vehicle) {
    if (!data) return
    if (!window.confirm(`Supprimer "${v.name}" et toutes ses échéances/entretiens ? Action irréversible.`))
      return
    await save(
      {
        vehicles: data.vehicles.filter((x) => x.id !== v.id),
        deadlines: data.deadlines.filter((d) => d.vehicleId !== v.id),
        maintenanceLog: data.maintenanceLog.filter((e) => e.vehicleId !== v.id),
      },
      `Voiture: suppression de "${v.name}"`,
    )
    if (selectedId === v.id) setSelectedId(null)
  }

  async function handleAddDeadline() {
    if (!data || !selected) return
    if (!deadlineDraft.label.trim() || !deadlineDraft.dueDate) {
      setFormError('Type et date sont requis.')
      return
    }
    setFormError(null)
    const newDeadline: Deadline = {
      id: 'dl_' + Math.random().toString(36).slice(2, 10),
      vehicleId: selected.id,
      label: deadlineDraft.label.trim(),
      dueDate: deadlineDraft.dueDate,
      notes: deadlineDraft.notes.trim() || undefined,
    }
    await save(
      { ...data, deadlines: [...data.deadlines, newDeadline] },
      `Voiture: échéance "${newDeadline.label}" ajoutée`,
    )
    setDeadlineDraft(emptyDeadlineDraft())
    setAddingDeadline(false)
  }

  function startEditDeadline(d: Deadline) {
    setEditingDeadlineId(d.id)
    setEditDeadlineDraft({ label: d.label, dueDate: d.dueDate, notes: d.notes ?? '' })
    setFormError(null)
  }

  async function handleEditDeadlineSave(id: string) {
    if (!data) return
    if (!editDeadlineDraft.label.trim() || !editDeadlineDraft.dueDate) {
      setFormError('Type et date sont requis.')
      return
    }
    setFormError(null)
    const nextDeadlines = data.deadlines.map((d) =>
      d.id === id
        ? {
            ...d,
            label: editDeadlineDraft.label.trim(),
            dueDate: editDeadlineDraft.dueDate,
            notes: editDeadlineDraft.notes.trim() || undefined,
          }
        : d,
    )
    await save({ ...data, deadlines: nextDeadlines }, `Voiture: échéance "${editDeadlineDraft.label}" modifiée`)
    setEditingDeadlineId(null)
  }

  async function handleDeleteDeadline(d: Deadline) {
    if (!data) return
    if (!window.confirm(`Supprimer l'échéance "${d.label}" ?`)) return
    await save(
      { ...data, deadlines: data.deadlines.filter((x) => x.id !== d.id) },
      `Voiture: échéance "${d.label}" supprimée`,
    )
  }

  async function toggleDeadlineDone(d: Deadline) {
    if (!data) return
    const nowDone = !isDeadlineDone(d)
    const nextDeadlines = data.deadlines.map((x) => (x.id === d.id ? { ...x, done: nowDone } : x))
    await save(
      { ...data, deadlines: nextDeadlines },
      `Voiture: échéance "${d.label}" ${nowDone ? 'marquée faite' : 'marquée à faire'}`,
    )
  }

  async function handleAddLog() {
    if (!data || !selected) return
    if (!logDraft.label.trim() || !logDraft.date) {
      setFormError('Type et date sont requis.')
      return
    }
    setFormError(null)
    const newEntry: MaintenanceEntry = {
      id: 'log_' + Math.random().toString(36).slice(2, 10),
      vehicleId: selected.id,
      date: logDraft.date,
      label: logDraft.label.trim(),
      mileage: logDraft.mileage ? Number(logDraft.mileage.replace(',', '.')) : undefined,
      cost: logDraft.cost ? Number(logDraft.cost.replace(',', '.')) : undefined,
      notes: logDraft.notes.trim() || undefined,
      done: logDraft.done,
    }
    await save(
      { ...data, maintenanceLog: [...data.maintenanceLog, newEntry] },
      `Voiture: entretien "${newEntry.label}" ajouté`,
    )
    setLogDraft(emptyLogDraft())
    setAddingLog(false)
  }

  async function toggleLogDone(e: MaintenanceEntry) {
    if (!data) return
    const nowDone = !isMaintenanceDone(e)
    const nextLog = data.maintenanceLog.map((x) => (x.id === e.id ? { ...x, done: nowDone } : x))
    await save(
      { ...data, maintenanceLog: nextLog },
      `Voiture: entretien "${e.label}" ${nowDone ? 'marqué fait' : 'marqué à faire'}`,
    )
  }

  async function handleDeleteLog(e: MaintenanceEntry) {
    if (!data) return
    if (!window.confirm(`Supprimer cet entretien "${e.label}" ?`)) return
    await save(
      { ...data, maintenanceLog: data.maintenanceLog.filter((x) => x.id !== e.id) },
      `Voiture: entretien "${e.label}" supprimé`,
    )
  }

  const deadlines = selected ? deadlinesForVehicle(data, selected.id) : []
  const log = selected ? logForVehicle(data, selected.id) : []
  const totalCost = log.filter(isMaintenanceDone).reduce((s, e) => s + (e.cost ?? 0), 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-normal">Voiture</h2>
        <button
          onClick={() => setAddingVehicle((v) => !v)}
          className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] transition-opacity hover:opacity-90"
        >
          + Ajouter un véhicule
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--red)]">{error}</p>}
      {formError && <p className="mb-3 text-sm text-[var(--red)]">{formError}</p>}

      {addingVehicle && (
        <div className="mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={vehicleDraft.name}
              onChange={(e) => setVehicleDraft({ ...vehicleDraft, name: e.target.value })}
              placeholder="Nom (ex: Peugeot 208)"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
            <input
              value={vehicleDraft.currentMileage}
              onChange={(e) => setVehicleDraft({ ...vehicleDraft, currentMileage: e.target.value })}
              placeholder="Kilométrage actuel"
              inputMode="decimal"
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddVehicle}
              disabled={saving}
              className="font-display rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
            <button
              onClick={() => setAddingVehicle(false)}
              className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {data.vehicles.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Aucun véhicule</h3>
          <p>Ajoute ta voiture pour suivre son kilométrage, ses échéances et son entretien.</p>
        </div>
      ) : (
        <>
          {data.vehicles.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-1">
              {data.vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`font-display rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    selected?.id === v.id
                      ? 'bg-[var(--surface-2)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
                {editingVehicleId === selected.id ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={editVehicleDraft.name}
                      onChange={(e) => setEditVehicleDraft({ ...editVehicleDraft, name: e.target.value })}
                      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                    />
                    <input
                      value={editVehicleDraft.currentMileage}
                      onChange={(e) =>
                        setEditVehicleDraft({ ...editVehicleDraft, currentMileage: e.target.value })
                      }
                      inputMode="decimal"
                      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                    />
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        onClick={() => handleEditVehicleSave(selected.id)}
                        disabled={saving}
                        className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                      >
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setEditingVehicleId(null)}
                        className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-xl font-bold">{selected.name}</div>
                      <div className="text-sm text-[var(--text-muted)]">
                        {fmtKm(selected.currentMileage)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditVehicle(selected)}
                        title="Modifier"
                        className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(selected)}
                        title="Supprimer"
                        className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium text-[var(--text-muted)]">Échéances</div>
                  <button
                    onClick={() => setAddingDeadline((v) => !v)}
                    className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold"
                  >
                    + Ajouter
                  </button>
                </div>

                {addingDeadline && (
                  <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={deadlineDraft.label}
                        onChange={(e) => setDeadlineDraft({ ...deadlineDraft, label: e.target.value })}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      >
                        {DEADLINE_PRESETS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={deadlineDraft.dueDate}
                        onChange={(e) => setDeadlineDraft({ ...deadlineDraft, dueDate: e.target.value })}
                        style={{ colorScheme: 'dark' }}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleAddDeadline}
                        disabled={saving}
                        className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                      >
                        {saving ? 'Enregistrement…' : 'Créer'}
                      </button>
                      <button
                        onClick={() => setAddingDeadline(false)}
                        className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {deadlines.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">Aucune échéance enregistrée.</p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {deadlines.map((d) =>
                      editingDeadlineId === d.id ? (
                        <div key={d.id} className="py-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={editDeadlineDraft.label}
                              onChange={(e) =>
                                setEditDeadlineDraft({ ...editDeadlineDraft, label: e.target.value })
                              }
                              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                            />
                            <input
                              type="date"
                              value={editDeadlineDraft.dueDate}
                              onChange={(e) =>
                                setEditDeadlineDraft({ ...editDeadlineDraft, dueDate: e.target.value })
                              }
                              style={{ colorScheme: 'dark' }}
                              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                            />
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleEditDeadlineSave(d.id)}
                              disabled={saving}
                              className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                            >
                              {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                            <button
                              onClick={() => setEditingDeadlineId(null)}
                              className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <button
                              onClick={() => toggleDeadlineDone(d)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                isDeadlineDone(d) ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
                              }`}
                              title={isDeadlineDone(d) ? 'Marquer à faire' : 'Marquer fait'}
                            >
                              {isDeadlineDone(d) && <span className="text-xs text-[#08090b]">✓</span>}
                            </button>
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-medium ${isDeadlineDone(d) ? 'text-[var(--text-faint)] line-through' : ''}`}
                              >
                                {d.label}
                              </div>
                              {!isDeadlineDone(d) && (
                                <div
                                  className={`text-xs ${isOverdue(d.dueDate) ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}
                                >
                                  {isOverdue(d.dueDate)
                                    ? `En retard depuis le ${fmtDate(d.dueDate)}`
                                    : `${fmtDate(d.dueDate)} · dans ${daysUntil(d.dueDate)} j`}
                                </div>
                              )}
                              {isDeadlineDone(d) && (
                                <div className="text-xs text-[var(--text-faint)]">{fmtDate(d.dueDate)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditDeadline(d)}
                              title="Modifier"
                              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--text)]"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteDeadline(d)}
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
                )}
              </div>

              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium text-[var(--text-muted)]">
                    Entretien
                    {totalCost > 0 && (
                      <span className="ml-2 text-[var(--text-faint)]">· {fmtEuro(totalCost)} au total</span>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingLog((v) => !v)}
                    className="font-display rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold"
                  >
                    + Ajouter
                  </button>
                </div>

                {addingLog && (
                  <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={logDraft.label}
                        onChange={(e) => setLogDraft({ ...logDraft, label: e.target.value })}
                        placeholder="Type (ex: Vidange, Pneus)"
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        type="date"
                        value={logDraft.date}
                        onChange={(e) => setLogDraft({ ...logDraft, date: e.target.value })}
                        style={{ colorScheme: 'dark' }}
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={logDraft.mileage}
                        onChange={(e) => setLogDraft({ ...logDraft, mileage: e.target.value })}
                        placeholder="Kilométrage (optionnel)"
                        inputMode="decimal"
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        value={logDraft.cost}
                        onChange={(e) => setLogDraft({ ...logDraft, cost: e.target.value })}
                        placeholder="Coût en € (optionnel)"
                        inputMode="decimal"
                        className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                      />
                      <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={logDraft.done}
                          onChange={(e) => setLogDraft({ ...logDraft, done: e.target.checked })}
                        />
                        Déjà fait (décoche pour un entretien prévu)
                      </label>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleAddLog}
                        disabled={saving}
                        className="font-display rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408] disabled:opacity-40"
                      >
                        {saving ? 'Enregistrement…' : 'Créer'}
                      </button>
                      <button
                        onClick={() => setAddingLog(false)}
                        className="font-display rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {log.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">Aucun entretien enregistré.</p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {log.map((e) => {
                      const done = isMaintenanceDone(e)
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <button
                              onClick={() => toggleLogDone(e)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                done ? 'border-[var(--emerald)] bg-[var(--emerald)]' : 'border-[var(--border)]'
                              }`}
                              title={done ? 'Marquer à faire' : 'Marquer fait'}
                            >
                              {done && <span className="text-xs text-[#08090b]">✓</span>}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                {e.label}
                                {!done && (
                                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--gold)]">
                                    Prévu
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {fmtDate(e.date)}
                                {e.mileage !== undefined ? ` · ${fmtKm(e.mileage)}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {e.cost !== undefined && (
                              <span className="font-display text-sm text-[var(--gold)]">{fmtEuro(e.cost)}</span>
                            )}
                            <button
                              onClick={() => handleDeleteLog(e)}
                              title="Supprimer"
                              className="rounded-md px-1.5 py-1 text-[var(--text-faint)] hover:text-[var(--red)]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
