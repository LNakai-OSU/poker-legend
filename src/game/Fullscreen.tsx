import { useEffect, useState } from 'react'
import { useTouchFirst } from './device'

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void }
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void }

const isFull = () => {
  const d = document as FsDoc
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement)
}
const standalone = () =>
  window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
const canFullscreen = () => {
  const el = document.documentElement as FsEl
  return !!(el.requestFullscreen || el.webkitRequestFullscreen)
}

export async function enterFullscreen(): Promise<void> {
  const el = document.documentElement as FsEl
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
    else el.webkitRequestFullscreen?.()
    // Only honoured in fullscreen, and not by every browser; the rotate prompt covers the rest.
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')
  } catch {
    // Refused or unsupported: the player can still rotate by hand.
  }
}

function useFullscreen(): boolean {
  const [full, setFull] = useState(() => isFull() || standalone())
  useEffect(() => {
    const update = () => setFull(isFull() || standalone())
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
    }
  }, [])
  return full
}

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return portrait
}

const pill: React.CSSProperties = {
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

/**
 * Phones: the game is drawn for a wide screen, so held upright it asks to be
 * turned, and offers fullscreen where the browser allows it (iPhone Safari does
 * not; there, Share → Add to Home Screen opens it fullscreen via the manifest).
 */
export function FullscreenControls() {
  const touch = useTouchFirst()
  const full = useFullscreen()
  const portrait = usePortrait()
  const can = canFullscreen()

  if (!touch) return null

  return (
    <>
      {can && !full && !portrait && (
        <button
          data-testid="fullscreen-button"
          aria-label="Full screen"
          onClick={() => void enterFullscreen()}
          style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top))',
            right: 108,
            zIndex: 50,
            width: 40,
            minHeight: 40,
            borderRadius: 8,
            border: '1px solid #4a4a66',
            background: 'rgba(10,10,16,0.8)',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ⛶
        </button>
      )}
      {portrait && (
        <div
          data-testid="rotate-prompt"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: '#07070c',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 56, transform: 'rotate(90deg)' }}>📱</div>
          <div style={{ fontSize: 20, color: '#f0d27a' }}>Turn your phone sideways</div>
          <div style={{ fontSize: 14, color: '#a8a8c0', maxWidth: 300 }}>
            Poker Legend is made for a wide screen.
            {!can && !full && ' For full screen on iPhone: Share → Add to Home Screen, then open it from there.'}
          </div>
          {can && !full && (
            <button style={pill} onClick={() => void enterFullscreen()}>
              Go full screen
            </button>
          )}
        </div>
      )}
    </>
  )
}
