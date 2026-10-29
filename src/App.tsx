import { useEffect, useState } from 'react'
import { GameApp } from './game/GameApp'
import { Editor } from './editor/Editor'
import { FullscreenControls } from './game/Fullscreen'
import { setSaveProfile } from './game/save'
import { activeProfile, profileSlug, signIn, useTabClaim } from './game/session'
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
        onSignIn={(n) => {
          signIn(n)
          setName(n)
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

  return (
    <>
      <FullscreenControls />
      {displaced ? <Displaced name={name} onReclaim={reclaim} /> : <GameApp key={slug} />}
    </>
  )
}

export default App
