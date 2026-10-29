import { useState } from 'react'
import { cleanName, knownProfiles, lastProfile, profileSlug } from './session'

const panel: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#07070c',
  color: '#e8e8f0',
  fontFamily: 'monospace',
  padding: 16,
  overflowY: 'auto',
}

const button: React.CSSProperties = {
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 8,
  border: '1px solid #c8a24a',
  background: '#1c1a10',
  color: '#f0d27a',
  fontFamily: 'monospace',
  fontSize: 16,
  cursor: 'pointer',
}

/** Who is playing: a name is all an account is, and it keeps their save to themselves. */
export function SignIn({ onSignIn }: { onSignIn: (name: string) => void }) {
  const [name, setName] = useState(lastProfile)
  const known = knownProfiles()
  const ok = profileSlug(cleanName(name)).length > 0
  const submit = () => ok && onSignIn(cleanName(name))

  return (
    <div style={panel} data-testid="sign-in">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ margin: 0, color: '#f0d27a', fontSize: 28, textAlign: 'center' }}>Poker Legend</h1>
        <p style={{ margin: 0, textAlign: 'center', color: '#a8a8c0', fontSize: 14 }}>
          Pick a name. Your run is saved under it on this device, apart from everyone else's.
        </p>
        <input
          autoFocus
          aria-label="Your name"
          value={name}
          maxLength={20}
          placeholder="Your name"
          onChange={(e) => setName(e.target.value)}
          style={{
            minHeight: 44,
            borderRadius: 8,
            border: '1px solid #4a4a66',
            background: '#10101a',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            fontSize: 16,
            padding: '0 12px',
          }}
        />
        <button type="submit" disabled={!ok} style={{ ...button, opacity: ok ? 1 : 0.5 }}>
          {known.some((n) => profileSlug(n) === profileSlug(name)) ? 'Continue' : 'Start'}
        </button>
        {known.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {known.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onSignIn(n)}
                style={{ ...button, minHeight: 36, fontSize: 14, border: '1px solid #4a4a66', background: '#10101a', color: '#e8e8f0' }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}

/** Another tab has taken this player over; this one stands down rather than fight over the save. */
export function Displaced({ name, onReclaim }: { name: string; onReclaim: () => void }) {
  return (
    <div style={panel} data-testid="displaced">
      <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: '#f0d27a' }}>{name} is playing in another tab</h2>
        <p style={{ margin: 0, color: '#a8a8c0', fontSize: 14 }}>
          Two tabs on one save would overwrite each other. This one has paused.
        </p>
        <button type="button" onClick={onReclaim} style={button}>
          Play here instead
        </button>
      </div>
    </div>
  )
}
