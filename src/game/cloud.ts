/**
 * Accounts that follow a player between devices (server/worker.ts).
 *
 * Optional: with no `VITE_SYNC_URL` the game is exactly what it was, a name and
 * a save on this device. With one, a name needs a password, the save is copied
 * to the server whenever it is written, and signing in somewhere else fetches it.
 * The server holds the save as opaque JSON; the game reads it through `reconcile`,
 * so a run carries on into a newer build.
 */
const URL_BASE: string = ((import.meta.env.VITE_SYNC_URL as string | undefined) ?? '').replace(/\/+$/, '')

export const cloudEnabled = (): boolean => URL_BASE !== ''

const tokenKey = (slug: string) => `poker-legend-token:${slug}`

export const tokenFor = (slug: string): string | null => {
  try {
    return localStorage.getItem(tokenKey(slug))
  } catch {
    return null
  }
}

function setToken(slug: string, token: string | null): void {
  try {
    if (token) localStorage.setItem(tokenKey(slug), token)
    else localStorage.removeItem(tokenKey(slug))
  } catch {
    // Without storage the player signs in again next visit.
  }
}

export type AuthError = 'name-taken' | 'wrong-login' | 'bad-credentials-format' | 'offline'

async function auth(path: '/account' | '/session', slug: string, name: string, password: string): Promise<AuthError | null> {
  try {
    const res = await fetch(`${URL_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })
    const body = (await res.json().catch(() => ({}))) as { token?: string; error?: AuthError }
    if (res.ok && body.token) {
      setToken(slug, body.token)
      return null
    }
    return body.error ?? 'offline'
  } catch {
    return 'offline'
  }
}

export const createAccount = (slug: string, name: string, password: string) => auth('/account', slug, name, password)
export const logIn = (slug: string, name: string, password: string) => auth('/session', slug, name, password)

export interface CloudSave {
  save: unknown
  savedAt: number
}

/** The server's copy, or null when there is none or it cannot be reached. */
export async function pull(slug: string): Promise<CloudSave | null> {
  const token = tokenFor(slug)
  if (!token || !cloudEnabled()) return null
  try {
    const res = await fetch(`${URL_BASE}/save`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) {
      setToken(slug, null)
      return null
    }
    if (!res.ok) return null
    const body = (await res.json()) as { save: unknown; savedAt?: number }
    return body.save ? { save: body.save, savedAt: body.savedAt ?? 0 } : null
  } catch {
    return null
  }
}

/** Copies a save to the server; false when it could not (offline, signed out). */
export async function push(slug: string, save: unknown, savedAt: number): Promise<boolean> {
  const token = tokenFor(slug)
  if (!token || !cloudEnabled()) return false
  try {
    const res = await fetch(`${URL_BASE}/save`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ save, savedAt }),
    })
    if (res.status === 401) setToken(slug, null)
    return res.ok
  } catch {
    return false
  }
}
