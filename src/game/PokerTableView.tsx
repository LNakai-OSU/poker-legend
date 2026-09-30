import type { HandResult, PublicState } from '../engine/table'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import { Card, cardText } from './Card'
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

export function PokerTableView({ state, lastResult, players, yourHole, insights }: PokerTableViewProps) {
  const labels = insights?.showPositions ? positionLabels(state) : null
  const handOver = !state.handInProgress && lastResult?.handNumber === state.handNumber
  const winnerIds = handOver ? potWinnerIds(lastResult) : new Set<string>()

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div data-testid="pot-value" data-pot={state.pot} style={{ marginBottom: 8 }}>
          Pot: <span key={state.pot} className="pot-bump">{state.pot}</span>
        </div>
        <div>
          {state.board.map((c, i) => (
            <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} />
          ))}
          {Array.from({ length: 5 - state.board.length }).map((_, i) => <Card key={`hidden-${i}`} faceDown />)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(6px, 2vw, 24px)', marginBottom: 20, flexWrap: 'wrap' }}>
        {state.players.map((p) => (
          <div
            key={p.id}
            className={winnerIds.has(p.id) ? 'seat-win' : undefined}
            style={{
              border: p.isActing ? '2px solid #f2c14e' : '1px solid #333',
              borderRadius: 8,
              padding: 'clamp(6px, 2vw, 12px)',
              opacity: p.folded ? 0.4 : 1,
              minWidth: 'clamp(104px, 28vw, 150px)',
              fontSize: 'clamp(11px, 3vw, 14px)',
              textAlign: 'center',
            }}
          >
            <div>
              {p.name}{p.isDealer ? ' (D)' : ''}
              {labels?.get(p.id) && (
                <span style={{ color: '#8ad4ff', fontSize: 11 }}> {labels.get(p.id)}</span>
              )}
            </div>
            <div data-testid={`stack-${p.id}`} data-stack={p.stack}>Stack: {p.stack}</div>
            <div>Bet: {p.streetContribution}</div>
            {p.id === 'you' ? (
              <div style={{ marginTop: 6 }}>
                {yourHole.map((c, i) => (
                  <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} />
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                {(() => {
                  const revealedThisHand =
                    !state.handInProgress && lastResult?.handNumber === state.handNumber
                      ? lastResult.revealed.find((r) => r.playerId === p.id)
                      : undefined
                  return revealedThisHand
                    ? revealedThisHand.holeCards.map((c, i) => (
                        <Card key={i} card={c} anim="flip" delayMs={i * 110} />
                      ))
                    : <><Card faceDown /><Card faceDown /></>
                })()}
              </div>
            )}
            {p.folded && <div>Folded</div>}
            {p.allIn && <div>All in</div>}
            {p.tell && !p.folded && (
              <div
                data-testid={`tell-${p.id}`}
                className={`tell-${p.tell.kind}`}
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontStyle: 'italic',
                  // A fainter cue is genuinely harder to notice, which is how
                  // better opponents stay hard to read — until you learn to look.
                  color: `rgba(242, 193, 78, ${
                    insights?.sharpEyes
                      ? Math.max(0.75, 0.35 + p.tell.visibility * 0.65)
                      : 0.35 + p.tell.visibility * 0.65
                  })`,
                }}
              >
                {tellText(p.name, p.tell)}
              </div>
            )}
          </div>
        ))}
      </div>

      {handOver && <ShowdownSummary result={lastResult} players={players} />}
    </>
  )
}
