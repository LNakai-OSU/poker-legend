import { useEffect, useRef } from 'react'
import { TABLES } from '../world/content'
import { isActionKey, useKeyLayer } from './keys'
import { playSound } from '../audio/audio'
import { TYPE, UI_FONT } from './pixel/webFont'

/**
 * After the final is lost and you have run out through the alley: one screen
 * and one button. Pressing it sits you back down at the final table with the
 * same fifteen thousand, which is the only way on until you win it.
 */
export function PlayAgain({ onDone }: { onDone: (skipped?: boolean) => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const finished = useRef(false)
  const isTop = useKeyLayer(true)
  const stack = Math.round(TABLES['lumina-finale'].buyIn * (TABLES['lumina-finale'].yourStack ?? 1))
  const bigBlind = TABLES['lumina-finale'].bigBlind

  const go = () => {
    if (finished.current) return
    finished.current = true
    playSound('deal')
    onDone()
  }

  useEffect(() => {
    button.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) go()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      data-testid="play-again-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 97,
        background: 'radial-gradient(ellipse at center, #2a0f16 0%, #0a0509 70%)',
        color: '#f2e8d0',
        fontFamily: UI_FONT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
        textAlign: 'center',
        animation: 'fade-in 600ms ease-out both',
      }}
    >
      <div style={{ color: '#c83a30', letterSpacing: 4, fontSize: TYPE.body }}>ELIMINATED · 6TH OF 6</div>
      <h1 style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 56px)', color: '#f2c14e' }}>The Legends Invitational</h1>
      <p style={{ margin: 0, maxWidth: 440, color: '#b8aa90', fontSize: TYPE.body }}>
        You are out of chips and out of the building. The table is not going anywhere. Neither is the seat at the end of it.
      </p>
      <p data-testid="play-again-stack" style={{ margin: 0, color: '#9a9ab0', fontSize: TYPE.body }}>
        You sit back down with ${stack.toLocaleString()} &middot; {(stack / bigBlind).toFixed(1)} big blinds
      </p>
      <button
        ref={button}
        data-testid="play-again"
        onClick={go}
        style={{
          marginTop: 8,
          background: '#a8281f',
          color: '#fff6e8',
          border: '2px solid #f2c14e',
          borderRadius: 6,
          padding: '14px 40px',
          fontFamily: UI_FONT,
          fontWeight: 'bold',
          fontSize: 'clamp(18px, 3vw, 26px)',
          cursor: 'pointer',
          boxShadow: '0 0 24px #a8281f88',
        }}
      >
        Play again
      </button>
    </div>
  )
}
