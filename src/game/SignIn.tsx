import { useState } from 'react'
import { cloudEnabled, tokenFor, type AuthError } from './cloud'
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

const MESSAGES: Record<AuthError, string> = {
  'name-taken': 'That name already has an account. Log in instead, or pick another name.',
  'wrong-login': 'Wrong name or password.',
  'bad-credentials-format': 'Use a name, and a password of at least 6 characters.',
  offline: "Couldn't reach the account server. Check your connection and try again.",
}

/** Who is playing: a name is all an account is, and it keeps their save to themselves. */
export function SignIn({
  onSignIn,
}: {
  onSignIn: (name: string, password: string, creating: boolean) => Promise<AuthError | null> | void
}) {
  const [name, setName] = useState(lastProfile)
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // With accounts on, a device that has never logged this name in needs the password.
  const needsPassword = cloudEnabled() && !tokenFor(profileSlug(cleanName(name)))
  const known = knownProfiles()
  const ok = profileSlug(cleanName(name)).length > 0 && (!needsPassword || password.length >= 6) && !busy
  const submit = async () => {
    if (!ok) return
    setBusy(true)
    setError(null)
    const failure = await onSignIn(cleanName(name), password, creating)
    setBusy(false)
    if (failure) setError(MESSAGES[failure])
  }

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
          {cloudEnabled()
            ? 'Log in to carry your run to any device, or create an account.'
            : "Pick a name. Your run is saved under it on this device, apart from everyone else's."}
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
        {needsPassword && (
          <input
            aria-label="Password"
            type="password"
            value={password}
            maxLength={100}
            placeholder={creating ? 'Choose a password (6+ characters)' : 'Password'}
            autoComplete={creating ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
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
        )}
        {error && (
          <p role="alert" style={{ margin: 0, color: '#ff8a8a', fontSize: 14, textAlign: 'center' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={!ok} style={{ ...button, opacity: ok ? 1 : 0.5 }}>
          {busy
            ? 'One moment…'
            : needsPassword
              ? creating
                ? 'Create account'
                : 'Log in'
              : known.some((n) => profileSlug(n) === profileSlug(name))
                ? 'Continue'
                : 'Start'}
        </button>
        {needsPassword && (
          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            style={{ ...button, minHeight: 36, fontSize: 14, border: '1px solid #4a4a66', background: 'transparent', color: '#a8a8c0' }}
          >
            {creating ? 'I already have an account' : 'New here? Create an account'}
          </button>
        )}
        {known.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {known.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => (tokenFor(profileSlug(n)) || !cloudEnabled() ? void onSignIn(n, '', false) : setName(n))}
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
