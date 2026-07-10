const CLIENT_ID_KEY = 'monhub_google_client_id'
const TOKEN_KEY = 'monhub_google_token'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

type StoredToken = { accessToken: string; expiresAt: number }

export function getClientId(): string | null {
  return localStorage.getItem(CLIENT_ID_KEY)
}

export function setClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim())
}

export function clearGoogleConnection() {
  localStorage.removeItem(CLIENT_ID_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function getStoredToken(): StoredToken | null {
  const raw = sessionStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  const parsed: StoredToken = JSON.parse(raw)
  if (parsed.expiresAt < Date.now()) return null
  return parsed
}

function storeToken(accessToken: string, expiresInSeconds: number) {
  const token: StoredToken = { accessToken, expiresAt: Date.now() + (expiresInSeconds - 60) * 1000 }
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

let gisLoadPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Impossible de charger Google Identity Services'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

/** Opens the Google OAuth popup and resolves with a fresh access token (read-only calendar scope). */
export async function requestAccessToken(): Promise<string> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Aucun Client ID Google configuré')
  await loadGis()

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        storeToken(resp.access_token, resp.expires_in)
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export async function getAccessToken(): Promise<string> {
  const stored = getStoredToken()
  if (stored) return stored.accessToken
  return requestAccessToken()
}

export function isConnected(): boolean {
  return !!getClientId()
}

export type GoogleCalendarEvent = {
  id: string
  title: string
  date: string
  time?: string
  endTime?: string
  location?: string
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function toTimeKey(iso: string): string | undefined {
  if (iso.length <= 10) return undefined // all-day event (date only, no time component)
  const d = new Date(iso)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

/** Fetches upcoming events (read-only) from the user's primary Google Calendar. */
export async function fetchUpcomingGoogleEvents(maxResults = 25): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken()
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`Échec de lecture de Google Calendar (${res.status})`)
  const json = await res.json()
  return (json.items ?? []).map(
    (item: {
      id: string
      summary?: string
      start: { date?: string; dateTime?: string }
      end: { date?: string; dateTime?: string }
      location?: string
    }) => {
      const startIso = item.start.dateTime ?? item.start.date ?? ''
      const endIso = item.end.dateTime ?? item.end.date ?? ''
      return {
        id: item.id,
        title: item.summary || '(sans titre)',
        date: toDateKey(startIso),
        time: toTimeKey(startIso),
        endTime: toTimeKey(endIso),
        location: item.location,
      }
    },
  )
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (resp: { access_token: string; expires_in: number; error?: string }) => void
          }): { requestAccessToken: () => void }
        }
      }
    }
  }
}
