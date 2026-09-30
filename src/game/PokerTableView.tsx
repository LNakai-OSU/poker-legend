import type { HandResult, PublicState } from '../engine/table'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import { Card } from './Card'
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

export function PokerTableView({ state, lastResult, players, yourHole, insights }: PokerTableViewProps) {
  const labels = insights?.showPositions ? positionLabels(state) : null

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div data-testid="pot-value" data-pot={state.pot} style={{ marginBottom: 8 }}>Pot: {state.pot}</div>
        <div>
          {state.board.map((c, i) => <Card key={i} card={c} />)}
          {Array.from({ length: 5 - state.board.length }).map((_, i) => <Card key={`hidden-${i}`} faceDown />)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(6px, 2vw, 24px)', marginBottom: 20, flexWrap: 'wrap' }}>
        {state.players.map((p) => (
          <div
            key={p.id}
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
                {yourHole.map((c, i) => <Card key={i} card={c} />)}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                {(() => {
                  const revealedThisHand =
                    !state.handInProgress && lastResult?.handNumber === state.handNumber
                      ? lastResult.revealed.find((r) => r.playerId === p.id)
                      : undefined
                  return revealedThisHand
                    ? revealedThisHand.holeCards.map((c, i) => <Card key={i} card={c} />)
                    : <><Card faceDown /><Card faceDown /></>
                })()}
              </div>
            )}
            {p.folded && <div>Folded</div>}
            {p.allIn && <div>All in</div>}
            {p.tell && !p.folded && (
              <div
                data-testid={`tell-${p.id}`}
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

      {!state.handInProgress && lastResult?.handNumber === state.handNumber && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {lastResult.pots.map((pot, i) => (
            <p key={i}>
              {pot.winnerIds.map((id) => players.find((pl) => pl.id === id)?.name).join(', ')} won {pot.amount}
            </p>
          ))}
        </div>
      )}
    </>
  )
}
