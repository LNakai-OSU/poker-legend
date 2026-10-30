import { useEffect, useState } from 'react'
import { GameApp } from './game/GameApp'
import { Editor } from './editor/Editor'
import { FullscreenControls } from './game/Fullscreen'
import { setSaveProfile, syncWithAccount } from './game/save'
import { cloudEnabled, createAccount, logIn, tokenFor } from './game/cloud'
import { activeProfile, profileSlug, signIn, useTabClaim } from './game/session'
import { isPlaytester } from './game/playtest'
import { Displaced, SignIn } from './game/SignIn'

/**
 * The game, or the editor at `#editor` (maps; `#editor/characters`, `#editor/events`).
 *
 * A hash rather than a button in the game: the editor is a tool for building
 * this thing, not a feature of it, and a player should never find their way into
 * it by accident.
 */
function App() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash === '#editor' || hash.startsWith('#editor/')) {
    return <Editor hash={hash} onClose={() => (window.location.hash = '')} />
  }
  return <Player />
}

/** Automated browsers play the single unnamed save the suites seed; people sign in. */
const automated = typeof navigator !== 'undefined' && navigator.webdriver === true

function Player() {
  const [name, setName] = useState<string | null>(() => (automated ? '' : activeProfile()))

  if (name === null) {
    return (
      <SignIn
        onSignIn={async (n, password, creating) => {
          const slug = profileSlug(n)
          // Already logged in on this device: no password asked.
          if (cloudEnabled() && !tokenFor(slug)) {
            const failure = await (creating ? createAccount : logIn)(slug, n, password)
            if (failure) return failure
          }
          signIn(n)
          setName(n)
          return null
        }}
      />
    )
  }
  return <Session name={name} />
}

function Session({ name }: { name: string }) {
  const slug = automated ? '' : profileSlug(name)
  // Set during render, before GameApp's first read of its save, and again on
  // each change of player.
  setSaveProfile(slug || null)
  const { displaced, reclaim } = useTabClaim(slug)
  // Whichever is newer, this device's save or the account's, is the one played.
  const [synced, setSynced] = useState(slug === '' || !cloudEnabled())
  useEffect(() => {
    if (synced) return
    let live = true
    void syncWithAccount(slug).finally(() => live && setSynced(true))
    return () => {
      live = false
    }
  }, [slug, synced])
  if (!synced) return <div style={{ position: 'fixed', inset: 0, background: '#07070c', color: '#a8a8c0', fontFamily: 'monospace', display: 'grid', placeItems: 'center' }}>Loading your run…</div>

  return (
    <>
      <FullscreenControls />
      {displaced ? <Displaced name={name} onReclaim={reclaim} /> : <GameApp key={slug} playtest={isPlaytester(slug)} />}
    </>
  )
}

export default App
