import { useRef } from 'react'
import { daysUntilRematch, type GameState } from './state'
import { swallowDoubleClick, useMenuKeys } from './keys'
import { buttonStyle } from './MenuScenes'
import { SPONSORS, TABLES } from '../world/content'
import { CHARACTERS } from '../world/characters'
import { TYPE, UI_FONT } from './pixel/webFont'

const HEADING = { fontSize: TYPE.large, fontWeight: 'normal', color: '#f2c14e' } as const

function FullScreen({ children, background = '#0a0a12' }: { children: React.ReactNode; background?: string }) {
  // Its one button answers Space, E and Enter like every other menu.
  const panel = useRef<HTMLDivElement>(null)
  useMenuKeys(panel)
  return (
    <div ref={panel} onClickCapture={swallowDoubleClick} style={{
      width: '100vw', minHeight: '100vh', background, color: '#e8e8f0', fontFamily: UI_FONT, fontSize: TYPE.body,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, textAlign: 'center', padding: 32, boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 560 }}>{children}</div>
    </div>
  )
}

/** Caught by collectors — they take most of the bankroll; the debt itself still stands. */
export function CaughtScene({ sponsorId, onRestart }: { sponsorId?: string | null; onRestart: () => void }) {
  const sponsor = sponsorId ? SPONSORS[sponsorId] : undefined
  const collector = sponsor ? CHARACTERS[sponsor.collector]?.name : undefined
  return (
    <FullScreen background="#160a0a">
      <h2 data-testid="caught-by" style={HEADING}>{collector ? `${collector} caught up with you.` : 'They caught up with you.'}</h2>
      <p>
        {sponsor
          ? `${sponsor.name}'s people, either side, walking you out through the service corridor. `
          : 'Two of them, either side, walking you out through the service corridor. '}
        Nobody looks up. They empty your pockets, take the coat off your back and the keys off your belt,
        and explain, patiently, what happens if there is a next time.
      </p>
      <p style={{ color: '#9a9ab0' }}>
        You wake up back where you last felt safe, with a bus fare and nothing else you own. What you owe has
        not moved a cent &mdash; they will just be looking for you again in a few days.
      </p>
      <button style={{ ...buttonStyle, marginTop: 12 }} onClick={onRestart}>Pick yourself up</button>
    </FullScreen>
  )
}

/**
 * Lost the heads-up match. Losing used to hand you back to the overworld like
 * any other session, with Nadia waiting to be challenged again — which made the
 * climax an expensive cash game you could grind until it went your way. The
 * buy-in is hers and the rematch is a week out.
 */
export function FinaleLostScene({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  const wait = daysUntilRematch(state)
  return (
    <FullScreen background="#160d12">
      <h2 style={HEADING}>She played you off the table.</h2>
      <p>
        The dealer breaks down your stack into hers without being asked, and somebody is already
        wiping the rail down. Nadia is talking to someone else by the time you stand up.
      </p>
      <p data-testid="finale-loss-cost" style={{ color: '#f2c14e' }}>
        The ${TABLES['lumina-finale'].buyIn.toLocaleString()} you put up is gone &mdash; that was the bet.
        You are carrying ${state.cash.toLocaleString()}.
      </p>
      <p style={{ color: '#9a9ab0' }}>
        {wait > 0
          ? `She will not rack it up again for ${wait} day${wait === 1 ? '' : 's'}. Build the roll back, and be better when she does.`
          : 'Build the roll back, and be better when she sits down again.'}
      </p>
      <button style={{ ...buttonStyle, marginTop: 12 }} onClick={onContinue}>Walk out</button>
    </FullScreen>
  )
}
