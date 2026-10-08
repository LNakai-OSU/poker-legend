import type { HandResult, PublicState } from '../engine/table'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import type { CSSProperties } from 'react'
import { Card, cardText } from './Card'
import { ChipStack } from './ChipStack'
import { avatarDataUrl, expressionFor, type Expression } from './avatars'
import { personalityFor } from '../world/personalities'
import { tellText } from './tellFlavor'
import { HandAnnouncer, type Announcement } from './HandAnnouncer'

export interface TableInsights {
  /** Unlocked by the mentor's position lesson. */
  showPositions: boolean
  /** Unlocked by the tells lesson — faint reads become legible instead of near-invisible. */
  sharpEyes: boolean
  /** Extra legibility bought with items or a meal, on top of the lesson. */
  tellClarity?: number
}

interface PokerTableViewProps {
  state: PublicState
  lastResult: HandResult | null
  players: PlayerConfig[]
  yourHole: CardData[]
  insights?: TableInsights
  /** A line of table talk currently on screen. */
  speech?: SeatSpeech | null
  /** The current key moment, announced over the felt instead of in a panel. */
  announcement?: Announcement | null
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
    // Six-handed: five opponents round the far rail, you at the near edge.
    5: [
      { left: '11%', top: '34%' },
      { left: '28%', top: '4%' },
      { left: '50%', top: '0%' },
      { left: '72%', top: '4%' },
      { left: '89%', top: '34%' },
    ],
  }
  return layouts[count] ?? layouts[3]
}

/**
 * How wide a seat is, name plate and all.
 *
 * A fixed width, not a minimum. A seat is positioned by its centre, so a child
 * wider than its seat grows out of both sides and over the neighbours — and the
 * seats hold text nobody sized: a line of flavour, and a tell. Left to themselves
 * they made the far-rail seats 150px wide with 15px between them, so whether two
 * players collided came down to how long their descriptions happened to be.
 *
 * Everything inside a seat wraps or clips within this instead.
 */
const SEAT_WIDTH = 'clamp(58px, 16vw, 96px)'

/**
 * Height reserved for the line of tell text, whether or not there is a tell.
 *
 * Two lines at the tell's font size. Reserved for the same reason the bet row is:
 * a seat that grows when a cue appears pushes its own cards around the felt.
 */
const TELL_ROW_HEIGHT = 26

function seatPlateStyle(isActing: boolean): CSSProperties {
  return {
    // A name plate on the rail: dark, slightly glassy, and lit when it is your turn.
    background: isActing
      ? 'linear-gradient(180deg, rgba(40,34,14,0.95) 0%, rgba(14,18,16,0.95) 100%)'
      : 'linear-gradient(180deg, rgba(14,22,19,0.9) 0%, rgba(6,11,10,0.92) 100%)',
    border: isActing ? '1px solid #f2c14e' : '1px solid #2c3d35',
    borderRadius: 10,
    // Sized against the window's height, because the felt is: at a fixed size the
    // plates were two-thirds of a short table and the seats overlapped the board.
    padding: 'clamp(1px, 0.5vh, 4px) clamp(4px, 1vw, 7px)',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: isActing
      ? '0 0 16px rgba(242,193,78,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.4)',
  }
}

/** The dealer button, as an actual button on the felt. */
function DealerButton() {
  return (
    <span
      data-testid="dealer-button"
      title="Dealer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #e2ddcf 60%, #b7b0a0 100%)',
        color: '#2a2a33',
        fontSize: 9,
        fontWeight: 'bold',
        lineHeight: 1,
        border: '1px solid #8d8678',
        boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
    >
      D
    </span>
  )
}

export function PokerTableView({
  state,
  lastResult,
  players,
  yourHole,
  insights,
  speech,
  announcement,
}: PokerTableViewProps) {
  const labels = insights?.showPositions ? positionLabels(state) : null
  const handOver = !state.handInProgress && lastResult?.handNumber === state.handNumber
  const winners = handOver ? potWinnerIds(lastResult) : new Set<string>()

  const you = state.players.find((p) => p.id === 'you')
  const opponents = state.players.filter((p) => p.id !== 'you')
  const positions = seatPositions(opponents.length)
  /** A full table needs more felt than a short-handed one. */
  const crowded = opponents.length >= 4

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
          // Scales with the window, and with how many people are at it: six seats,
          // a board and a pot do not fit in the same felt three seats do, and
          // squeezing them in is what pushed the far seats onto the pot. The floor
          // stays low enough that a short laptop window still fits the betting
          // buttons underneath.
          height: crowded
            ? 'clamp(195px, 45vh, 470px)'
            : 'clamp(200px, 44vh, 430px)',
          borderRadius: '46% / 58%',
          background:
            // Woven baize rather than a flat green: a broad highlight where the
            // lights hang, a fine weave over it, and the cloth going dark at the rail.
            `radial-gradient(ellipse at 50% 38%, rgba(255,255,255,0.09) 0%, transparent 58%),
             repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px),
             repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px),
             radial-gradient(ellipse at 50% 42%, #22744f 0%, #175c3f 52%, #0d3927 100%)`,
          // A padded leather rail, lit from above.
          //
          // Deliberately NOT border-image: setting one makes Chromium ignore
          // border-radius entirely, which drew the rail as a hard-cornered
          // rectangle around the rounded felt — a green oval pasted on a brown
          // box. The gradient is faked with layered shadows instead.
          border: '11px solid #4a3324',
          boxShadow:
            'inset 0 0 70px rgba(0,0,0,0.5),' +
            'inset 0 3px 6px rgba(0,0,0,0.45),' +
            '0 -3px 0 1px #6b4a33,' +
            '0 4px 0 1px #2c1d14,' +
            '0 14px 36px rgba(0,0,0,0.5)',
        }}
      >
        {/* The betting line: chips go inside it, and it gives the oval a centre. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '14% 11%',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: 'inset 0 0 28px rgba(0,0,0,0.22)',
            pointerEvents: 'none',
          }}
        />
        <HandAnnouncer announcement={announcement ?? null} />

        {/* Pot and board, in the middle where the chips end up. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '54%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: 'min(72%, 300px)',
            zIndex: 3,
          }}
        >
          {/* Above the board. Below it is worse, not better: that is where your own
              seat comes up to, so the pot simply collided with the near side
              instead of the far one. */}
          <div
            data-testid="pot-value"
            data-pot={state.pot}
            style={{
              marginBottom: 6,
              fontSize: 'clamp(11px, 2.6vw, 14px)',
              color: '#cfe8d8',
              // Its own backing, so the pot stays readable even on a crowded
              // table where a far seat's box reaches this part of the felt.
              display: 'inline-block',
              padding: '1px 10px',
              borderRadius: 999,
              background: 'rgba(6,14,11,0.72)',
            }}
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
              <Card key={`hidden-${i}`} placeholder />
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
                // No z-index and no isolation here on purpose: either one makes the
                // seat its own stacking context, and a chip's z-index would then
                // only be compared with its own seat's cards — so a bet could still
                // paint over the neighbouring seat's hand.

                left: pos.left,
                top: pos.top,
                transform: 'translate(-50%, 0)',
                textAlign: 'center',
                width: SEAT_WIDTH,
                // Dimmed with a filter rather than `opacity`, because opacity
                // below 1 creates a stacking context — which took a folded seat's
                // chips out of the felt's ordering and let them paint over another
                // player's cards.
                filter: p.folded ? 'brightness(0.55) saturate(0.7)' : undefined,
                transition: 'filter 200ms',
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
                  style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    margin: '0 auto',
                    width: 'clamp(22px, 4.6vh, 40px)',
                    height: 'clamp(22px, 4.6vh, 40px)',
                  }}
                />
                <div style={{ fontSize: 'clamp(8px, 1.3vh, 11px)', whiteSpace: 'nowrap' }}>
                  {p.name}
                  {p.isDealer && <DealerButton />}
                  {labels?.get(p.id) && <span style={{ color: '#8ad4ff' }}> {labels.get(p.id)}</span>}
                </div>
                <div
                  data-testid={`stack-${p.id}`}
                  data-stack={p.stack}
                  style={{
                    fontSize: 'clamp(9px, 1.5vh, 12px)',
                    color: '#f2c14e',
                    fontWeight: 'bold',
                    letterSpacing: 0.3,
                  }}
                >
                  {p.stack.toLocaleString()}
                </div>
                {/* Dropped entirely when the screen is too small to spare the
                    two lines — see `.seat-style` in index.css. It is flavour, and
                    the alternative is seats that reach the middle of the felt. */}
                <div
                  className="seat-style"
                  style={{
                    fontSize: 'clamp(7px, 1.1vh, 9px)',
                    color: '#8f8fa6',
                    lineHeight: 1.2,
                    // Wraps inside the seat, and stops at three lines. Three rather
                    // than two because these lines are how the regulars introduce
                    // themselves, and two cut most of them off mid-sentence; the
                    // extra line costs nothing on a window tall enough to show the
                    // flavour at all, since below that it is dropped outright.
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {personality.style}
                </div>
                {p.allIn && (
                  <div style={{ fontSize: 9, color: '#f0a0a0', letterSpacing: 1 }}>ALL IN</div>
                )}
                {/* What they have out in front of them this street. */}
                <ChipStack amount={p.streetContribution} testId={`bet-${p.id}`} />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                  marginTop: 2,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
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

              {p.tell && !p.folded ? (
                <div
                  data-testid={`tell-${p.id}`}
                  className={`tell-${p.tell.kind}`}
                  style={{
                    fontSize: 10,
                    fontStyle: 'italic',
                    // Wrapped inside the seat rather than sizing it. Left to size
                    // itself, a cue like "Mack re-settles their arms" made the seat
                    // half again as wide as its plate, and wrote the sentence across
                    // the next player's cards.
                    marginTop: 2,
                    height: TELL_ROW_HEIGHT,
                    overflow: 'hidden',
                    lineHeight: 1.2,
                    // The lesson, a card protector and a hot meal all buy the same
                    // thing: a cue you can actually make out.
                    color: `rgba(242, 193, 78, ${Math.min(
                      1,
                      (insights?.sharpEyes
                        ? Math.max(0.8, 0.4 + p.tell.visibility * 0.6)
                        : 0.4 + p.tell.visibility * 0.6) + (insights?.tellClarity ?? 0),
                    )})`,
                  }}
                >
                  {tellText(p.name, p.tell)}
                </div>
              ) : (
                <div style={{ height: TELL_ROW_HEIGHT, marginTop: 2 }} />
              )}

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
              width: SEAT_WIDTH,
            }}
          >
            <div className={winners.has('you') ? 'seat-win' : undefined} style={seatPlateStyle(you.isActing)}>
              <div style={{ fontSize: 'clamp(8px, 1.3vh, 11px)', whiteSpace: 'nowrap' }}>
                You
                {you.isDealer && <DealerButton />}
                {labels?.get('you') && <span style={{ color: '#8ad4ff' }}> {labels.get('you')}</span>}
              </div>
              <div
                data-testid="stack-you"
                data-stack={you.stack}
                style={{
                  fontSize: 'clamp(10px, 1.8vh, 14px)',
                  color: '#f2c14e',
                  fontWeight: 'bold',
                  letterSpacing: 0.3,
                }}
              >
                {you.stack.toLocaleString()}
              </div>
              {you.allIn && <div style={{ fontSize: 9, color: '#f0a0a0', letterSpacing: 1 }}>ALL IN</div>}
              <ChipStack amount={you.streetContribution} testId="bet-you" />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 3,
                marginTop: 3,
                position: 'relative',
                zIndex: 2,
              }}
            >
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
