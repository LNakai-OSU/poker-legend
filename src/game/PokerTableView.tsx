import type { HandResult, PublicState } from '../engine/table'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import type { CSSProperties } from 'react'
import { Card, cardText } from './Card'
import { ChipStack } from './ChipStack'
import { avatarDataUrl, expressionFor, type Expression } from './avatars'
import { personalityFor } from '../world/personalities'
import { tellText } from './tellFlavor'

export interface TableInsights {
  /** Unlocked by the mentor's position lesson. */
  showPositions: boolean
  /** Unlocked by the tells lesson — faint reads become legible instead of near-invisible. */
  sharpEyes: boolean
}

interface PokerTableViewProps {
  state: PublicState
  lastResult: HandResult | null
  players: PlayerConfig[]
  yourHole: CardData[]
  insights?: TableInsights
  /** A line of table talk currently on screen. */
  speech?: SeatSpeech | null
}

export interface SeatSpeech {
  playerId: string
  text: string
}

/** Seat labels relative to the button, the way a real table is described. */
function positionLabels(state: PublicState): Map<string, string> {
  const seated = state.players.filter((p) => !p.isEliminated)
  const dealerIndex = seated.findIndex((p) => p.isDealer)
  const labels = new Map<string, string>()
  if (dealerIndex === -1) return labels

  const order = seated.length === 2 ? ['BTN/SB', 'BB'] : ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO']
  seated.forEach((_, offset) => {
    const player = seated[(dealerIndex + offset) % seated.length]
    labels.set(player.id, order[offset] ?? 'MP')
  })
  return labels
}

/**
 * What a player actually took from a finished hand, split into the two things
 * the old summary conflated: chips won from other players, and their own
 * uncalled bet handed back. Only the first is winning a pot.
 */
export function handTakings(result: HandResult, playerId: string): { won: number; returned: number } {
  let won = 0
  let returned = 0
  for (const pot of result.pots) {
    if (!pot.winnerIds.includes(playerId)) continue
    const share = pot.amountPerWinner + (pot.winnerIds[0] === playerId ? pot.remainder : 0)
    if (pot.uncalled) returned += share
    else won += share
  }
  return { won, returned }
}

/** Everyone who genuinely won chips from someone else this hand. */
export function potWinnerIds(result: HandResult): Set<string> {
  return new Set(result.pots.filter((pot) => !pot.uncalled).flatMap((pot) => pot.winnerIds))
}

/**
 * The single authoritative read-out of a finished hand: the board, every hand
 * that got turned over, and who won what. There used to be two of these on
 * screen at once — a per-pot-layer list and a separate box — which disagreed
 * with each other, so there is now exactly one and every scene shares it.
 */
export function ShowdownSummary({ result, players }: { result: HandResult; players: PlayerConfig[] }) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id
  const winners = potWinnerIds(result)
  const shown = [...result.revealed].sort(
    (a, b) => Number(winners.has(b.playerId)) - Number(winners.has(a.playerId)),
  )
  // Nobody turned a hand over, so the pot was taken by everyone else folding.
  const foldWinners = result.revealed.length === 0 ? [...winners] : []

  const takingsText = (playerId: string) => {
    const { won, returned } = handTakings(result, playerId)
    const parts: string[] = []
    if (won > 0) parts.push(`won ${won.toLocaleString()}`)
    if (returned > 0) parts.push(`${returned.toLocaleString()} returned uncalled`)
    return parts.join(' · ')
  }

  return (
    <div
      data-testid="showdown-summary"
      style={{
        maxWidth: 680,
        margin: '0 auto 12px',
        padding: 'clamp(8px, 2.5vw, 14px)',
        borderRadius: 10,
        border: '1px solid rgba(242,193,78,0.45)',
        background: '#141d2e',
        fontSize: 'clamp(11px, 3vw, 13px)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}
    >
      <div style={{ color: '#f2c14e', letterSpacing: 2, marginBottom: 6 }}>SHOWDOWN</div>
      <div style={{ color: '#9aa4b8', marginBottom: 6 }}>
        Board: {result.board.map(cardText).join(' ') || '—'}
      </div>
      {shown.map((r) => {
        const summary = takingsText(r.playerId)
        const isWinner = winners.has(r.playerId)
        return (
          <div
            key={r.playerId}
            data-testid={`showdown-${r.playerId}`}
            style={{ color: isWinner ? '#7fe0a0' : '#c8c8d4' }}
          >
            <strong>{nameOf(r.playerId)}</strong> {r.holeCards.map(cardText).join(' ')} &middot;{' '}
            {HAND_CATEGORY_NAMES[bestHand([...r.holeCards, ...result.board]).category]}
            {summary ? <> &mdash; {summary}</> : <> &mdash; lost</>}
          </div>
        )
      })}
      {foldWinners.map((id) => {
        const { won, returned } = handTakings(result, id)
        return (
          <div key={id} data-testid={`showdown-${id}`} style={{ color: '#7fe0a0' }}>
            <strong>{nameOf(id)}</strong> took {won.toLocaleString()} uncontested &mdash; everyone else folded, so
            no cards were shown.
            {returned > 0 && <> {returned.toLocaleString()} of the last bet came back uncalled.</>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Where each seat sits around the felt, as a share of the table box. You are
 * always at the rail; opponents are arranged across from you.
 */
function seatPositions(count: number): { left: string; top: string }[] {
  const layouts: Record<number, { left: string; top: string }[]> = {
    1: [{ left: '50%', top: '2%' }],
    2: [
      { left: '22%', top: '5%' },
      { left: '78%', top: '5%' },
    ],
    3: [
      { left: '16%', top: '18%' },
      { left: '50%', top: '1%' },
      { left: '84%', top: '18%' },
    ],
    4: [
      { left: '14%', top: '26%' },
      { left: '36%', top: '1%' },
      { left: '64%', top: '1%' },
      { left: '86%', top: '26%' },
    ],
  }
  return layouts[count] ?? layouts[3]
}

function seatPlateStyle(isActing: boolean): CSSProperties {
  return {
    background: 'rgba(8, 14, 12, 0.78)',
    border: isActing ? '2px solid #f2c14e' : '1px solid #2c3d35',
    borderRadius: 8,
    padding: '3px 6px',
    minWidth: 'clamp(62px, 17vw, 92px)',
    boxShadow: isActing ? '0 0 14px rgba(242,193,78,0.4)' : 'none',
  }
}

export function PokerTableView({
  state,
  lastResult,
  players,
  yourHole,
  insights,
  speech,
}: PokerTableViewProps) {
  const labels = insights?.showPositions ? positionLabels(state) : null
  const handOver = !state.handInProgress && lastResult?.handNumber === state.handNumber
  const winners = handOver ? potWinnerIds(lastResult) : new Set<string>()

  const you = state.players.find((p) => p.id === 'you')
  const opponents = state.players.filter((p) => p.id !== 'you')
  const positions = seatPositions(opponents.length)

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
      <div
        data-testid="felt"
        style={{
          position: 'relative',
          margin: '0 auto',
          width: '100%',
          // Height is set directly rather than via an aspect ratio: coupling the
          // two made a min-height force the felt wider than a phone screen, which
          // pushed the right-hand seat off the display entirely.
          height: 'clamp(300px, 46vh, 430px)',
          borderRadius: '46% / 58%',
          background: 'radial-gradient(ellipse at 50% 42%, #1f6b4a 0%, #15543b 55%, #0e3b2a 100%)',
          border: '10px solid #4a3324',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.45), 0 10px 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* Pot and board, in the middle where the chips end up. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '54%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: 'min(72%, 300px)',
          }}
        >
          <div
            data-testid="pot-value"
            data-pot={state.pot}
            style={{ marginBottom: 6, fontSize: 'clamp(11px, 2.6vw, 14px)', color: '#cfe8d8' }}
          >
            Pot{' '}
            <span key={state.pot} className="pot-bump" style={{ color: '#f2c14e', fontWeight: 'bold' }}>
              {state.pot.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {state.board.map((c, i) => (
              <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} />
            ))}
            {Array.from({ length: 5 - state.board.length }).map((_, i) => (
              <Card key={`hidden-${i}`} faceDown />
            ))}
          </div>
        </div>

        {opponents.map((p, i) => {
          const pos = positions[i] ?? positions[0]
          const revealed = handOver ? lastResult.revealed.find((r) => r.playerId === p.id) : undefined
          const personality = personalityFor(p.id)
          const expression: Expression = expressionFor({
            tellKind: p.tell && !p.folded ? (p.tell.kind as Expression) : null,
            isActing: p.isActing,
            wonLast: handOver && winners.has(p.id),
            lostLast: handOver && !winners.has(p.id) && !p.folded,
          })

          return (
            <div
              key={p.id}
              data-testid={`seat-${p.id}`}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                transform: 'translate(-50%, 0)',
                textAlign: 'center',
                opacity: p.folded ? 0.45 : 1,
                transition: 'opacity 200ms',
              }}
            >
              {speech?.playerId === p.id && (
                <div data-testid={`speech-${p.id}`} className="speech-bubble">
                  {speech.text}
                </div>
              )}

              <div className={winners.has(p.id) ? 'seat-win' : undefined} style={seatPlateStyle(p.isActing)}>
                <img
                  src={avatarDataUrl(personality.look, expression)}
                  alt=""
                  width={40}
                  height={40}
                  style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
                />
                <div style={{ fontSize: 11 }}>
                  {p.name}
                  {p.isDealer ? ' (D)' : ''}
                  {labels?.get(p.id) && <span style={{ color: '#8ad4ff' }}> {labels.get(p.id)}</span>}
                </div>
                <div data-testid={`stack-${p.id}`} data-stack={p.stack} style={{ fontSize: 11, color: '#f2c14e' }}>
                  {p.stack.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: '#8f8fa6' }}>{personality.style}</div>
                {p.allIn && <div style={{ fontSize: 9, color: '#e05a5a' }}>ALL IN</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                {revealed
                  ? revealed.holeCards.map((c, ci) => (
                      <Card key={ci} card={c} anim="flip" delayMs={ci * 110} small />
                    ))
                  : p.folded
                    ? null
                    : (
                        <>
                          <Card faceDown small />
                          <Card faceDown small />
                        </>
                      )}
              </div>

              {p.tell && !p.folded && (
                <div
                  data-testid={`tell-${p.id}`}
                  className={`tell-${p.tell.kind}`}
                  style={{
                    fontSize: 10,
                    fontStyle: 'italic',
                    marginTop: 2,
                    color: `rgba(242, 193, 78, ${
                      insights?.sharpEyes
                        ? Math.max(0.8, 0.4 + p.tell.visibility * 0.6)
                        : 0.4 + p.tell.visibility * 0.6
                    })`,
                  }}
                >
                  {tellText(p.name, p.tell)}
                </div>
              )}

              <ChipStack amount={p.streetContribution} testId={`bet-${p.id}`} />
            </div>
          )
        })}

        {you && (
          <div
            data-testid="seat-you"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '1%',
              transform: 'translate(-50%, 0)',
              textAlign: 'center',
            }}
          >
            <ChipStack amount={you.streetContribution} testId="bet-you" />
            <div className={winners.has('you') ? 'seat-win' : undefined} style={seatPlateStyle(you.isActing)}>
              <div style={{ fontSize: 11 }}>
                You{you.isDealer ? ' (D)' : ''}
                {labels?.get('you') && <span style={{ color: '#8ad4ff' }}> {labels.get('you')}</span>}
              </div>
              <div data-testid="stack-you" data-stack={you.stack} style={{ fontSize: 13, color: '#f2c14e' }}>
                {you.stack.toLocaleString()}
              </div>
              {you.allIn && <div style={{ fontSize: 9, color: '#e05a5a' }}>ALL IN</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 3 }}>
              {yourHole.map((c, i) => (
                <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} />
              ))}
            </div>
          </div>
        )}
      </div>

      {handOver && lastResult && <ShowdownSummary result={lastResult} players={players} />}
    </div>
  )
}
