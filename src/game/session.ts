import { useEffect, useRef, useState } from 'react'

/**
 * Players and tabs.
 *
 * A name is a profile: its save lives under its own key, so several people can
 * play the same deployed page — on one browser or many — without touching each
 * other's run. The name in use belongs to the *tab* (sessionStorage), so a
 * second tab can be someone else; the last name used is only remembered to
 * prefill the box. Two tabs signed in as the same name would overwrite each
 * other's save, so the newer one takes over and the older one steps aside.
 */
const PROFILES_KEY = 'poker-legend-profiles'
const LAST_KEY = 'poker-legend-last-profile'
const ACTIVE_KEY = 'poker-legend-active-profile'
const CHANNEL = 'poker-legend-session'

export const profileSlug = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24)

export const cleanName = (name: string): string => name.trim().replace(/\s+/g, ' ').slice(0, 20)

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value)
  } catch {
    // Without storage the player simply isn't remembered.
  }
}

export function knownProfiles(): string[] {
  try {
    const parsed: unknown = JSON.parse(read(() => localStorage, PROFILES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : []
  } catch {
    return []
  }
}

export const lastProfile = (): string => read(() => localStorage, LAST_KEY) ?? ''
export const activeProfile = (): string | null => read(() => sessionStorage, ACTIVE_KEY)

export function signIn(name: string): void {
  const clean = cleanName(name)
  // The first name on a browser inherits the run that was there before names
  // existed, so the person who has been playing doesn't lose it.
  const legacy = read(() => localStorage, 'poker-legend-save-v2')
  const mine = `poker-legend-save-v2:${profileSlug(clean)}`
  if (legacy && knownProfiles().length === 0 && read(() => localStorage, mine) === null) {
    write(() => localStorage, mine, legacy)
  }
  const others = knownProfiles().filter((n) => profileSlug(n) !== profileSlug(clean))
  write(() => localStorage, PROFILES_KEY, JSON.stringify([clean, ...others]))
  write(() => localStorage, LAST_KEY, clean)
  write(() => sessionStorage, ACTIVE_KEY, clean)
}

export function signOut(): void {
  try {
    sessionStorage.removeItem(ACTIVE_KEY)
  } catch {
    // Nothing to forget.
  }
}

/**
 * True while another tab has claimed this profile after us. `reclaim` takes it
 * back, which in turn displaces the other tab.
 */
export function useTabClaim(slug: string): { displaced: boolean; reclaim: () => void } {
  const [displaced, setDisplaced] = useState(false)
  const me = useRef(Math.random().toString(36).slice(2))
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(CHANNEL)
    channel.current = ch
    ch.onmessage = (e: MessageEvent<{ slug: string; tab: string }>) => {
      if (e.data.slug === slug && e.data.tab !== me.current) setDisplaced(true)
    }
    ch.postMessage({ slug, tab: me.current })
    return () => {
      ch.close()
      channel.current = null
    }
  }, [slug])

  return {
    displaced,
    reclaim: () => {
      channel.current?.postMessage({ slug, tab: me.current })
      setDisplaced(false)
    },
  }
}
