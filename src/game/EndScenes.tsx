import type { GameState } from './state'
import { buttonStyle } from './MenuScenes'

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

/** Caught by collectors — the run ends and rolls back to the last checkpoint. */
export function CaughtScene({ onRestart }: { onRestart: () => void }) {
  return (
    <FullScreen background="#160a0a">
      <h2>They caught up with you.</h2>
      <p>
        Two of them, either side, walking you out through the service corridor. Nobody in the room
        looks up. They take what you have and explain, patiently, what happens if there is a next time.
      </p>
      <p style={{ color: '#9a9ab0' }}>You wake up back where you last felt safe, with nothing.</p>
      <button style={{ ...buttonStyle, marginTop: 12 }} onClick={onRestart}>Start again from your last checkpoint</button>
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
