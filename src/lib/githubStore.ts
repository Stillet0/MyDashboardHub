const DATA_OWNER = 'stillet0'
const DATA_REPO = 'monhub-data'
const TOKEN_KEY = 'monhub_gh_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

function base64ToUtf8(str: string): string {
  return decodeURIComponent(escape(atob(str)))
}

function authHeaders() {
  const token = getToken()
  if (!token) throw new Error('Aucun token GitHub configuré')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  }
}

/** Vérifie que le token a bien accès au repo de données. */
export async function checkToken(token: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${DATA_OWNER}/${DATA_REPO}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  return res.ok
}

/** Lit un fichier JSON du repo de données. Renvoie `null` si le fichier n'existe pas encore. */
export async function getFile<T>(path: string): Promise<{ data: T; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${DATA_OWNER}/${DATA_REPO}/contents/${path}`,
    { headers: authHeaders() },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Échec de lecture de ${path} (${res.status})`)
  const json = await res.json()
  return { data: JSON.parse(base64ToUtf8(json.content)), sha: json.sha }
}

/**
 * Écrit un fichier JSON dans le repo de données.
 * `sha` doit être le SHA connu du fichier (obtenu via getFile) ; s'il ne correspond plus
 * au SHA courant côté GitHub, l'écriture est refusée (conflit avec un autre appareil).
 */
export async function putFile(
  path: string,
  data: unknown,
  sha: string | undefined,
  message: string,
): Promise<{ sha: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${DATA_OWNER}/${DATA_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: utf8ToBase64(JSON.stringify(data, null, 2)),
        sha,
      }),
    },
  )
  if (res.status === 409) {
    throw new Error('Conflit : ce fichier a été modifié depuis un autre appareil. Recharge avant de réessayer.')
  }
  if (!res.ok) throw new Error(`Échec d'écriture de ${path} (${res.status})`)
  const json = await res.json()
  return { sha: json.content.sha }
}
