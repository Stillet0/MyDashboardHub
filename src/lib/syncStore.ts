import { getFile, putFile } from './githubStore'

type DirtyEntry = { data: unknown; sha: string | undefined; message: string }

const dirty = new Map<string, DirtyEntry>()
const shaByPath = new Map<string, string | undefined>()
let flushing = false
let listeners: Array<() => void> = []

function cacheKey(path: string) {
  return 'monhub_cache_' + path
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

/** Records a local edit to be synced on the next flush (periodic, or on close). Does not touch the network. */
export function markDirty(path: string, data: unknown, message: string) {
  const sha = shaByPath.get(path)
  dirty.set(path, { data, sha, message })
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
  notify()
  const entries = [...dirty.entries()]
  for (const [path, { data, sha, message }] of entries) {
    try {
      const res = await putFile(path, data, sha, message, keepalive)
      cacheWrite(path, data, res.sha)
      dirty.delete(path)
    } catch {
      // Left in the dirty map; retried on the next periodic flush or close.
    }
  }
  flushing = false
  notify()
}
