import { isNotificationSupported } from '../../lib/notifications'
import type { Reminder, Urgency } from '../../lib/reminders'

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  soon: 'Bientôt',
}

const URGENCY_COLOR: Record<Urgency, string> = {
  overdue: 'var(--red)',
  today: 'var(--gold)',
  soon: 'var(--text-muted)',
}

type ModuleLink =
  | 'Finances'
  | 'Agenda'
  | 'Tâches'
  | 'Habitudes'
  | 'Voiture'
  | 'Documents'
  | 'Santé'
  | 'Objectifs'
  | 'Voyages'
  | 'Notes'
  | 'Contacts'

type Props = {
  reminders: Reminder[]
  onNavigate: (module: ModuleLink) => void
  permission: NotificationPermission | 'unsupported'
  onEnableNotifications: () => void
}

export default function OverviewReminders({ reminders, onNavigate, permission, onEnableNotifications }: Props) {
  const grouped: Record<Urgency, Reminder[]> = { overdue: [], today: [], soon: [] }
  reminders.forEach((r) => grouped[r.urgency].push(r))

  return (
    <div>
      {isNotificationSupported() && permission === 'default' && (
        <div className="mb-4 flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
          <span className="text-sm text-[var(--text-muted)]">
            Active les notifications pour être alerté des rappels en retard.
          </span>
          <button
            onClick={onEnableNotifications}
            className="font-display shrink-0 rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[#1a1408]"
          >
            Activer
          </button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Notifications bloquées dans les réglages du navigateur — les rappels restent visibles ici.
        </p>
      )}

      {reminders.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-muted)]">
          <h3 className="font-display mb-2 text-xl text-[var(--text)]">Rien à signaler</h3>
          <p>Aucune échéance, tâche ou événement urgent pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['overdue', 'today', 'soon'] as Urgency[]).map((urgency) =>
            grouped[urgency].length === 0 ? null : (
              <div key={urgency} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="mb-3 text-sm font-medium" style={{ color: URGENCY_COLOR[urgency] }}>
                  {URGENCY_LABEL[urgency]} ({grouped[urgency].length})
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {grouped[urgency].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onNavigate(r.module)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{r.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {[r.module, r.detail].filter(Boolean).join(' · ')}
                        </div>
                        {r.tip && <div className="mt-0.5 text-xs text-[var(--gold)]">{r.tip}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
