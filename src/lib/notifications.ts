const NOTIFIED_KEY = 'monhub_notified_ids'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  return Notification.requestPermission()
}

function readNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeNotified(map: Record<string, string>) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

/**
 * Fires a native notification for each reminder id not already notified today.
 * De-duping is per calendar day so the same overdue item doesn't re-notify on
 * every check within the same day, but does resurface the next day.
 */
export function notifyNewReminders(
  reminders: Array<{ id: string; title: string; detail?: string; module: string }>,
) {
  if (getPermission() !== 'granted') return
  const todayKey = new Date().toISOString().slice(0, 10)
  const notified = readNotified()
  let changed = false

  for (const r of reminders) {
    if (notified[r.id] === todayKey) continue
    try {
      // Sur une PWA installée sur iOS (ajoutée à l'écran d'accueil), Safari n'autorise
      // `new Notification()` que depuis un Service Worker (`showNotification()`) et lève une
      // exception ici — sans try/catch, ça faisait planter tout l'onglet Aperçu.
      new Notification(`MonHub · ${r.module}`, {
        body: r.detail ? `${r.title} — ${r.detail}` : r.title,
        tag: r.id,
      })
    } catch (e) {
      console.error('Notification impossible sur cet appareil :', e)
    }
    notified[r.id] = todayKey
    changed = true
  }

  if (changed) writeNotified(notified)
}
