import { getFile, putFile } from './githubStore'

type DirtyEntry = { data: unknown; sha: string | undefined; message: string }

export type ConflictInfo = { path: string; label: string }

const DIRTY_REGISTRY_KEY = 'monhub_dirty_registry'

const PATH_LABELS: Record<string, string> = {
  'data/finances.json': 'Finances',
  'data/agenda.json': 'Agenda',
  'data/taches.json': 'Tâches',
  'data/habitudes.json': 'Habitudes',
  'data/voiture.json': 'Voiture',
  'data/documents.json': 'Documents',
  'data/sante.json': 'Santé',
  'data/objectifs.json': 'Objectifs',
  'data/voyages.json': 'Voyages',
}

const dirty = new Map<string, DirtyEntry>(loadDirtyRegistry())
const shaByPath = new Map<string, string | undefined>()
let flushing = false
let lastError: string | null = null
let lastConflict: ConflictInfo | null = null
let listeners: Array<() => void> = []

function cacheKey(path: string) {
  return 'monhub_cache_' + path
}

function loadDirtyRegistry(): Array<[string, DirtyEntry]> {
  try {
    const raw = localStorage.getItem(DIRTY_REGISTRY_KEY)
    return raw ? Object.entries(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

function saveDirtyRegistry() {
  localStorage.setItem(DIRTY_REGISTRY_KEY, JSON.stringify(Object.fromEntries(dirty)))
}

export function cacheRead<T>(path: string): { data: T; sha?: string } | null {
  const raw = localStorage.getItem(cacheKey(path))
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function cacheWrite<T>(path: string, data: T, sha: string | undefined) {
  localStorage.setItem(cacheKey(path), JSON.stringify({ data, sha }))
  shaByPath.set(path, sha)
}

/**
 * Records a local edit to be synced on the next flush (periodic, or on close). Does not touch the
 * network, but writes through to the local cache and to a persisted dirty registry immediately, so
 * the edit survives a crash/hard-reload even if the flush never gets a chance to run.
 */
export function markDirty(path: string, data: unknown, message: string) {
  const sha = shaByPath.get(path)
  dirty.set(path, { data, sha, message })
  cacheWrite(path, data, sha)
  saveDirtyRegistry()
  notify()
}

export function hasPendingChanges(): boolean {
  return dirty.size > 0
}

export function isDirty(path: string): boolean {
  return dirty.has(path)
}

export function onSyncStateChange(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

function notify() {
  listeners.forEach((l) => l())
}

export function isFlushing(): boolean {
  return flushing
}

/** Message de la dernière tentative de synchronisation ratée, ou `null` si tout est à jour. */
export function getLastSyncError(): string | null {
  return lastError
}

/**
 * Si le dernier échec est un vrai conflit de SHA (un autre appareil a écrit entre-temps),
 * renvoie le fichier concerné : il faut alors un choix explicite (garder sa version ou
 * reprendre celle à jour), pas juste un "réessayer" qui échouerait indéfiniment avec le
 * même SHA périmé.
 */
export function getLastConflict(): ConflictInfo | null {
  return lastConflict
}

/** Écrase la version distante avec la modification locale en attente, en reprenant le SHA à jour. */
export async function resolveConflictKeepLocal(path: string): Promise<void> {
  const entry = dirty.get(path)
  if (!entry) return
  const fresh = await getFile(path)
  const res = await putFile(path, entry.data, fresh?.sha, entry.message, false)
  cacheWrite(path, entry.data, res.sha)
  dirty.delete(path)
  saveDirtyRegistry()
  if (lastConflict?.path === path) lastConflict = null
  lastError = null
  notify()
}

/** Abandonne la modification locale en attente et reprend la version distante à jour. */
export async function resolveConflictDiscardLocal(path: string): Promise<void> {
  dirty.delete(path)
  saveDirtyRegistry()
  const fresh = await getFile(path)
  if (fresh) cacheWrite(path, fresh.data, fresh.sha)
  if (lastConflict?.path === path) lastConflict = null
  lastError = null
  notify()
}

/** Fetches the remote copy for a path, seeding the local cache and known SHA (used on first load). */
export async function fetchAndCache<T>(path: string, defaultValue: T): Promise<T> {
  const res = await getFile<T>(path)
  const data = res?.data ?? defaultValue
  if (!dirty.has(path)) {
    cacheWrite(path, data, res?.sha)
  } else {
    shaByPath.set(path, res?.sha)
  }
  return data
}

/** Pushes all pending local changes to GitHub. Safe to call repeatedly; a no-op if nothing is dirty. */
export async function flushDirty(keepalive = false): Promise<void> {
  if (flushing || dirty.size === 0) return
  flushing = true
  lastError = null
  notify()
  const entries = [...dirty.entries()]
  for (const [path, { data, sha, message }] of entries) {
    try {
      const res = await putFile(path, data, sha, message, keepalive)
      cacheWrite(path, data, res.sha)
      dirty.delete(path)
      saveDirtyRegistry()
      if (lastConflict?.path === path) lastConflict = null
    } catch (e) {
      // Left in the dirty map (and the persisted registry); retried on the next periodic flush or close.
      const message = e instanceof Error ? e.message : `Échec de synchronisation de ${path}`
      lastError = message
      // Un vrai conflit de SHA a un message dédié (voir githubStore.putFile) : dans ce cas,
      // un simple "réessayer" échouerait indéfiniment avec le même SHA périmé — il faut un
      // choix explicite (voir resolveConflictKeepLocal / resolveConflictDiscardLocal).
      lastConflict = message.startsWith('Conflit') ? { path, label: PATH_LABELS[path] ?? path } : null
    }
  }
  flushing = false
  notify()
}
