import { useEffect, useState } from 'react'
import { GameApp } from './game/GameApp'
import { MapEditor } from './editor/MapEditor'

/**
 * The game, or the map editor at `#editor`.
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

  if (hash === '#editor') {
    return <MapEditor onClose={() => (window.location.hash = '')} />
  }
  return <GameApp />
}

export default App
