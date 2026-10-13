import { useEffect, useState } from 'react'
import { GameApp } from './game/GameApp'
import { Editor } from './editor/Editor'

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
  return <GameApp />
}

export default App
