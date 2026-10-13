import { useState } from 'react'
import { MapEditor } from './MapEditor'
import { CharacterEditor } from './CharacterEditor'
import { EventEditor } from './EventEditor'
import { EditorStyles, EditorTabs, type Tab } from './editorUi'

/**
 * The editor: maps, characters and events, at `#editor`.
 *
 * Which tab, and who or what is selected in it, live in the hash —
 * `#editor/characters/marcus`, `#editor/events/poker-night` — so a link goes
 * straight to somebody, and a reload lands you back where you were.
 *
 * A tab stays mounted once you have opened it, hidden while you are on another,
 * so looking something up in Events does not throw away a half-written
 * character — and coming back finds the same person selected.
 */
export function Editor({ hash, onClose }: { hash: string; onClose: () => void }) {
  const [, part, selectedPart] = hash.replace(/^#/, '').split('/')
  const tab: Tab = part === 'characters' || part === 'events' ? part : 'maps'
  const selected = selectedPart ? decodeURIComponent(selectedPart) : null

  const [visited, setVisited] = useState<Tab[]>([tab])
  const [remembered, setRemembered] = useState<Partial<Record<Tab, string>>>(selected ? { [tab]: selected } : {})
  // Kept in step during render rather than in an effect, so a tab is never
  // drawn for one frame with the selection it had before.
  if (!visited.includes(tab)) setVisited([...visited, tab])
  if (selected && remembered[tab] !== selected) setRemembered({ ...remembered, [tab]: selected })

  const showing = (which: Tab) => (which === tab ? undefined : true)
  return (
    <>
      <EditorStyles />
      {visited.includes('maps') && (
        <div hidden={showing('maps')}>
          <MapEditor onClose={onClose} nav={<EditorTabs tab="maps" />} />
        </div>
      )}
      {visited.includes('characters') && (
        <div hidden={showing('characters')}>
          <CharacterEditor selected={(tab === 'characters' ? selected : null) ?? remembered.characters ?? null} onClose={onClose} />
        </div>
      )}
      {visited.includes('events') && (
        <div hidden={showing('events')}>
          <EventEditor selected={(tab === 'events' ? selected : null) ?? remembered.events ?? null} onClose={onClose} />
        </div>
      )}
    </>
  )
}
