import { daysUntilRematch, type GameState } from './state'
import { buttonStyle } from './MenuScenes'
import { TABLES } from '../world/content'

function FullScreen({ children, background = '#0a0a12' }: { children: React.ReactNode; background?: string }) {
  return (
    <div style={{
      width: '100vw', minHeight: '100vh', background, color: '#e8e8f0', fontFamily: 'monospace',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, textAlign: 'center', padding: 32, boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 560 }}>{children}</div>
    </div>
  )
}

/** Caught by collectors — they seize your bankroll; the debt itself still stands. */
export function CaughtScene({ onRestart }: { onRestart: () => void }) {
  return (
    <FullScreen background="#160a0a">
      <h2>They caught up with you.</h2>
      <p>
        Two of them, either side, walking you out through the service corridor. Nobody in the room
        looks up. They take what you have and explain, patiently, what happens if there is a next time.
      </p>
      <p style={{ color: '#9a9ab0' }}>
        You wake up back where you last felt safe, with nothing. What you owe has not moved a cent
        &mdash; they will just be looking for you again in a few days.
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
      <h2>She played you off the table.</h2>
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

/** Won the heads-up match — the penthouse, and open-ended play afterwards. */
export function EndingScene({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  return (
    <FullScreen background="#0d1420">
      <h2>Porto Lumina, forty-one floors up.</h2>
      <p>
        The lift attendant does not ask who you are. The room is corner glass, harbour on two sides,
        and the felt table by the window was left exactly where Nadia kept it.
      </p>
      <p>
        You started with a friend&rsquo;s kitchen table and whatever was in your pocket. Day {state.day}, and
        you are holding ${state.cash.toLocaleString()}.
      </p>
      <p style={{ color: '#9a9ab0' }}>
        There is no next stop above this one. There is just the game, whenever you want it.
      </p>
      <button style={{ ...buttonStyle, marginTop: 12 }} onClick={onContinue}>Keep playing</button>
    </FullScreen>
  )
}
