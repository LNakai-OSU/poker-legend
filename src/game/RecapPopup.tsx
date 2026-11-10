import { halsNotes, type Recap } from './review'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import type { TableTheme } from './tableThemes'

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`

/**
 * What the sitting came to, and Hal's notes on it. Shown when you stand up from
 * a cash game: the moment the boss goal counts your profit is the moment to say
 * how you earned it.
 */
export function RecapPopup({ theme, P, recap, onContinue }: { theme: TableTheme; P: number; recap: Recap; onContinue: () => void }) {
  const notes = halsNotes(recap)
  return (
    <div
      data-testid="recap-popup"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4 * P,
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at center, rgba(6,8,14,0.55), rgba(6,8,14,0.85))',
        pointerEvents: 'auto',
      }}
    >
      <Panel
        theme={theme}
        scale={P}
        testId="recap-card"
        style={{
          padding: 7 * P,
          display: 'flex',
          flexDirection: 'column',
          gap: 3 * P,
          width: 'min(100%, ' + Math.round(230 * P) + 'px)',
          maxHeight: '100%',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <PixelText text="The sitting" scale={P} ink={INK.gold} />
        <PixelText text={`${money(recap.net)} · ${recap.hands} hand${recap.hands === 1 ? '' : 's'} · ${recap.potsWon} pot${recap.potsWon === 1 ? '' : 's'} won`} scale={P} ink={recap.net >= 0 ? INK.green : INK.red} wrap />
        {recap.bestHand ? <PixelText text={`Best hand: ${recap.bestHand}`} scale={P} ink={INK.dim} wrap /> : null}
        <PixelText text="Hal's notes" scale={P} ink={INK.gold} />
        {notes.map((line, i) => (
          <div key={i} data-testid="recap-note">
            <PixelText text={line} scale={P} ink={INK.light} wrap />
          </div>
        ))}
        <PxButton lines={['Done']} scale={P} role="raise" width={Math.round(90 * P)} height={Math.round(16 * P)} onClick={onContinue} testId="recap-continue" />
      </Panel>
    </div>
  )
}
