export type Contact = {
  id: string
  name: string
  relationship?: string
  birthday?: string // 'YYYY-MM-DD' — l'année sert à calculer l'âge, le mois/jour à la récurrence annuelle
  giftIdeas?: string
  notes?: string
}

export type ContactsData = { contacts: Contact[] }

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// Un champ date mal formé ne doit jamais faire planter tout l'écran.
function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function fmtDate(dateKey: string): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date)
}

export function daysUntil(dateKey: string): number {
  const due = parseDateKey(dateKey)
  if (!due) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

/** Prochaine occurrence de l'anniversaire (cette année si pas encore passée, sinon l'an prochain). */
export function nextBirthday(birthday: string, from = new Date()): string | null {
  const date = parseDateKey(birthday)
  if (!date) return null
  const fromKey = toDateKey(from)
  let candidate = new Date(from.getFullYear(), date.getMonth(), date.getDate())
  if (toDateKey(candidate) < fromKey) candidate = new Date(from.getFullYear() + 1, date.getMonth(), date.getDate())
  return toDateKey(candidate)
}

/** Âge que la personne aura à la prochaine occurrence de son anniversaire. */
export function ageTurning(birthday: string, nextBirthdayKey: string): number | null {
  const birthDate = parseDateKey(birthday)
  const next = parseDateKey(nextBirthdayKey)
  if (!birthDate || !next) return null
  return next.getFullYear() - birthDate.getFullYear()
}

export function sortedContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const na = a.birthday ? nextBirthday(a.birthday) : null
    const nb = b.birthday ? nextBirthday(b.birthday) : null
    if (!na && !nb) return a.name.localeCompare(b.name)
    if (!na) return 1
    if (!nb) return -1
    return na.localeCompare(nb) || a.name.localeCompare(b.name)
  })
}
