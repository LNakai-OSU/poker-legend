import type { CSSProperties } from 'react'
import type { Card } from '../engine/types'
import { personalityFor } from '../world/characters'
import type { AvatarLook, Expression } from './avatars'
import { portraitBackdropUrl, portraitUrl, PORTRAIT_SIZE } from './portraits'
import { cardBackUrl, cardFaceUrl, CARD_ART } from './pixel/cards'
import { INK } from './pixel/ink'
import { Panel, PxLine } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { TABLE_THEMES } from './tableThemes'
import { useCrispScale } from './useCrispScale'
import { useTouchFirst } from './device'

/**
 * One shot of the televised final, framed like a phone clip of a poker
 * broadcast: a close-up of whoever is making the decision, a banner over the
 * top, each live hand with its odds, action and stack down the left, the
 * blinds, board and pot down the right, and the booth underneath.
 *
 * Everything is drawn from the game's own portraits and cards.
 */

const THEME = TABLE_THEMES.finale
const SMALL = CARD_ART.small
/** The shot is laid out on a grid this wide and this tall; one scale fits it to the window. */
const W = 200
const VIDEO_Y = 34
const VIDEO_H = 190
const H = 292

export const YOU_LOOK: AvatarLook = { skin: '#e8b890', hair: '#3a2a20', hairStyle: 'short', shirt: '#4a7a5a', accessory: 'none' }

export type ShotWho = 'you' | 'contessa'

export interface ShotSeat {
  who: ShotWho
  hole: Card[]
  /** Chance to win, in percent. */
  odds: number
  /** RAISE, BET, CALL, ALL IN, WINNER… blank for nothing yet. */
  action: string
  stack: number
}

export interface Shot {
  headline: string
  focus: ShotWho
  expression: Expression
  seats: ShotSeat[]
  board: Card[]
  pot: number
  blinds: string
  /** Who is speaking and what they say, as `Chip: …`. */
  commentary: string
}

const NAMES: Record<ShotWho, string> = { you: 'YOU', contessa: 'CONTESSA' }
const TAG_COLOUR: Record<string, string> = {
  'ALL IN': '#c83a30',
  RAISE: '#d8a030',
  BET: '#2a6ad8',
  CALL: '#3a9d5c',
  CHECK: '#3a9d5c',
  WINNER: '#d8a030',
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`

export function BroadcastShot({ shot }: { shot: Shot }) {
  const P = useCrispScale(W, H, 8, 1)
  const touch = useTouchFirst()
  const u = (n: number) => n * P
  const look = shot.focus === 'you' ? YOU_LOOK : personalityFor('contessa').look
  const face = portraitUrl(look, shot.expression, shot.focus === 'you' ? 'hero' : 'contessa')
  const portraitPx = PORTRAIT_SIZE * P * 3
  const box = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => ({
    position: 'absolute',
    left: u(x),
    top: u(y),
    width: u(w),
    height: u(h),
    ...extra,
  })

  return (
    <div
      data-testid="broadcast"
      data-focus={shot.focus}
      style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', background: '#05040a', overflow: 'hidden' }}
    >
      <div style={{ position: 'relative', width: u(W), height: u(H), alignSelf: 'center' }}>
        {/* The camera: the stage behind, the player filling the frame. */}
        <div
          style={box(0, VIDEO_Y, W, VIDEO_H, {
            backgroundImage: `url(${portraitBackdropUrl(THEME.ui.portraitBg)})`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
            overflow: 'hidden',
          })}
        >
          <img
            key={`${shot.focus}-${shot.expression}-${shot.headline}`}
            src={face}
            alt={`${NAMES[shot.focus]}, looking ${shot.expression}`}
            draggable={false}
            style={{
              position: 'absolute',
              left: (u(W) - portraitPx) / 2,
              top: u(6),
              width: portraitPx,
              height: portraitPx,
              imageRendering: 'pixelated',
              animation: 'fade-in 420ms ease-out both',
            }}
          />
        </div>

        {/* The banner over the top. */}
        <div
          data-testid="broadcast-headline"
          style={box(4, 8, W - 8, 22, {
            background: '#f8f8f0',
            border: `${P}px solid #0c0a10`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          })}
        >
          <PixelText text={shot.headline} scale={P} wrap align="center" ink={{ color: '#14141c', shadow: null }} />
        </div>

        {/* Each hand still live: cards, odds, what they did, what they have left. */}
        {shot.seats.map((seat, i) => {
          const y = VIDEO_Y + 100 + i * 45
          return (
            <div key={seat.who} data-testid={`shot-seat-${seat.who}`} style={box(4, y, 94, 42)}>
              <div style={box(0, 0, 94, 42, { background: 'rgba(8,10,20,0.78)', borderRadius: P })} />
              <div style={box(1, 1, SMALL.w * 2 + 2, SMALL.h, { display: 'flex', gap: u(2) })}>
                {seat.hole.map((card) => (
                  <img key={`${card.rank}${card.suit}`} src={cardFaceUrl(card, 'small')} alt="" draggable={false} style={{ width: u(SMALL.w), height: u(SMALL.h), imageRendering: 'pixelated' }} />
                ))}
              </div>
              <div style={box(34, 2, 58, 8)}>
                <PixelText text={NAMES[seat.who]} scale={P} ink={INK.light} />
              </div>
              <div
                data-testid={`shot-odds-${seat.who}`}
                style={box(34, 11, 22, 10, { background: '#2a6ad8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: P })}
              >
                <PixelText text={`${seat.odds}%`} scale={P} ink={INK.light} />
              </div>
              <div style={box(1, 25, 92, 16, { display: 'flex', alignItems: 'center', gap: u(3) })}>
                {seat.action && (
                  <div style={{ background: TAG_COLOUR[seat.action] ?? '#4a4a66', height: u(13), padding: `0 ${u(2)}px`, display: 'flex', alignItems: 'center', borderRadius: P }}>
                    <PixelText text={seat.action} scale={P} ink={INK.light} />
                  </div>
                )}
                <PixelText text={money(seat.stack)} scale={P} ink={INK.light} />
              </div>
            </div>
          )
        })}

        {/* The blinds, the board, the pot. */}
        <div data-testid="shot-board-panel" style={box(102, VIDEO_Y + 128, 94, 58)}>
          <div style={box(0, 0, 94, 58, { background: 'rgba(8,10,20,0.78)', borderRadius: P })} />
          <div style={box(3, 3, 88, 8, { display: 'flex', justifyContent: 'space-between' })}>
            <PixelText text="BLINDS" scale={P} ink={INK.dim} />
            <PixelText text={shot.blinds} scale={P} ink={INK.light} />
          </div>
          <div data-testid="board" style={box(3, 14, 88, SMALL.h, { display: 'flex', gap: u(1) })}>
            {Array.from({ length: 5 }, (_, i) => {
              const card = shot.board[i]
              return (
                <img
                  key={i}
                  src={card ? cardFaceUrl(card, 'small') : cardBackUrl(THEME.cardBack, 'small')}
                  alt=""
                  draggable={false}
                  style={{ width: u(SMALL.w), height: u(SMALL.h), imageRendering: 'pixelated' }}
                />
              )
            })}
          </div>
          <div style={box(3, 40, 88, 14, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <PixelText text="POT" scale={P} ink={INK.dim} />
            <div style={{ background: '#6a4a18', border: `${P}px solid #d8a030`, padding: `0 ${u(3)}px`, display: 'flex', alignItems: 'center', height: u(12), boxSizing: 'border-box', borderRadius: P }}>
              <PixelText text={money(shot.pot)} scale={P} ink={INK.gold} />
            </div>
          </div>
        </div>

        {/* The booth, underneath. */}
        <Panel
          theme={THEME}
          scale={P}
          testId="dock"
          style={box(4, VIDEO_Y + VIDEO_H + 4, W - 8, 58, { padding: 3 * P, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' })}
        >
          <PxLine scale={P} wrap ink={{ color: '#2a5a9a', shadow: '#c8d8f0' }} testId="broadcast-line" text={shot.commentary} />
          <PxLine scale={P} align="right" ink={{ color: '#8a8a98', shadow: '#dcdce4' }} testId="intro-prompt" text={touch ? 'tap ▸' : 'space ▸'} />
        </Panel>
      </div>
    </div>
  )
}
