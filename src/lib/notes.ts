export type NoteSpace = 'Pro' | 'Perso'

export type Note = {
  id: string
  title: string
  body: string
  space: NoteSpace
  tags?: string[]
  links?: string[] // liens manuels explicites vers d'autres notes, en plus des [[wiki-links]] détectés dans le corps
  createdAt: string // 'YYYY-MM-DD'
  updatedAt: string // 'YYYY-MM-DD'
  pinned?: boolean
}

export type NotesData = { notes: Note[] }

export function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function sortedNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
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
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** Renvoie les titres référencés par [[Titre]] dans le corps d'une note. */
export function extractWikiLinkTitles(body: string): string[] {
  const titles: string[] = []
  const re = /\[\[([^\]]+)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) titles.push(m[1].trim())
  return titles
}

export function resolveWikiLinks(note: Note, allNotes: Note[]): Note[] {
  const titles = extractWikiLinkTitles(note.body).map((t) => t.toLowerCase())
  return allNotes.filter((n) => n.id !== note.id && titles.includes(n.title.toLowerCase()))
}

const STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'a', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par',
  'avec', 'ce', 'cet', 'cette', 'ces', 'que', 'qui', 'quoi', 'dont', 'ou', 'est', 'sont', 'etre', 'avoir', 'il', 'elle',
  'ils', 'elles', 'je', 'tu', 'nous', 'vous', 'on', 'se', 'sa', 'son', 'ses', 'the', 'and', 'or', 'of', 'to', 'in', 'on',
  'for', 'with', 'is', 'are', 'be', 'this', 'that', 'not', 'from', 'but',
])

/** Mots significatifs d'un texte (minuscules, sans accents, sans mots vides) pour comparer deux notes. */
export function extractKeywords(text: string): Set<string> {
  const stripped = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const words = stripped.match(/[a-z0-9]{3,}/g) ?? []
  return new Set(words.filter((w) => !STOPWORDS.has(w)))
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  a.forEach((x) => {
    if (b.has(x)) inter++
  })
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

export type NoteEdge = { a: string; b: string; weight: number; kind: 'link' | 'tag' | 'keyword' }

/**
 * Construit les liens de la "constellation" entre notes : liens explicites (wiki-links [[..]] ou
 * manuels) toujours affichés, et liens suggérés automatiquement quand deux notes partagent des
 * tags ou un vocabulaire suffisamment proche. Calcul 100% local (sans IA) : instantané, gratuit,
 * fonctionne hors-ligne. Le bouton IA de suggestion va plus loin pour les rapprochements que le
 * simple vocabulaire ne peut pas capter (voir suggestRelatedNotesPrompt).
 */
export function buildNoteEdges(notes: Note[], keywordThreshold = 0.12): NoteEdge[] {
  const edges = new Map<string, NoteEdge>()
  const keyOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const keywordSets = new Map(notes.map((n) => [n.id, extractKeywords(n.title + ' ' + n.body)]))

  function addEdge(a: string, b: string, weight: number, kind: NoteEdge['kind']) {
    if (a === b) return
    const key = keyOf(a, b)
    const existing = edges.get(key)
    if (!existing || existing.weight < weight) edges.set(key, { a, b, weight, kind })
  }

  notes.forEach((n) => {
    resolveWikiLinks(n, notes).forEach((target) => addEdge(n.id, target.id, 1, 'link'))
    ;(n.links ?? []).forEach((id) => addEdge(n.id, id, 1, 'link'))
  })

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const a = notes[i]
      const b = notes[j]
      if (edges.has(keyOf(a.id, b.id))) continue
      const sharedTags = (a.tags ?? []).filter((t) => (b.tags ?? []).includes(t))
      if (sharedTags.length > 0) {
        addEdge(a.id, b.id, Math.min(1, 0.4 + sharedTags.length * 0.15), 'tag')
        continue
      }
      const sim = jaccard(keywordSets.get(a.id)!, keywordSets.get(b.id)!)
      if (sim >= keywordThreshold) addEdge(a.id, b.id, sim, 'keyword')
    }
  }

  return [...edges.values()]
}

export function edgesForNote(edges: NoteEdge[], noteId: string): NoteEdge[] {
  return edges.filter((e) => e.a === noteId || e.b === noteId)
}

export function otherNoteId(edge: NoteEdge, noteId: string): string {
  return edge.a === noteId ? edge.b : edge.a
}
