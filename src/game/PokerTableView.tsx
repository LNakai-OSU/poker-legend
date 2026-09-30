import type { HandResult, PublicState } from '../engine/table'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import { Card } from './Card'
import { tellText } from './tellFlavor'

interface PokerTableViewProps {
  state: PublicState
  lastResult: HandResult | null
  players: PlayerConfig[]
  yourHole: CardData[]
}

export function PokerTableView({ state, lastResult, players, yourHole }: PokerTableViewProps) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div data-testid="pot-value" data-pot={state.pot} style={{ marginBottom: 8 }}>Pot: {state.pot}</div>
        <div>
          {state.board.map((c, i) => <Card key={i} card={c} />)}
          {Array.from({ length: 5 - state.board.length }).map((_, i) => <Card key={`hidden-${i}`} faceDown />)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        {state.players.map((p) => (
          <div
            key={p.id}
            style={{
              border: p.isActing ? '2px solid #f2c14e' : '1px solid #333',
              borderRadius: 8,
              padding: 12,
              opacity: p.folded ? 0.4 : 1,
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            <div>{p.name}{p.isDealer ? ' (D)' : ''}</div>
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
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontStyle: 'italic',
                  // A fainter cue is genuinely harder to notice, which is how
                  // better opponents stay hard to read.
                  color: `rgba(242, 193, 78, ${0.35 + p.tell.visibility * 0.65})`,
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
