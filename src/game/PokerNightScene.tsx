import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction } from '../engine/ai'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import { Card } from './Card'

const PLAYERS: PlayerConfig[] = [
  { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: 500 },
  { id: 'marcus', name: 'Marcus', isHuman: false, skillTier: 'novice', startingStack: 500 },
  { id: 'dana', name: 'Dana', isHuman: false, skillTier: 'novice', startingStack: 500 },
]

function createTable() {
  return new TexasHoldEmTable(PLAYERS, { smallBlind: 5, bigBlind: 10, rng: defaultRng })
}

interface PokerNightSceneProps {
  onWin: () => void
}

export function PokerNightScene({ onWin }: PokerNightSceneProps) {
  const tableRef = useRef(createTable())
  const [tick, setTick] = useState(0)
  const rerender = () => setTick((t) => t + 1)
  const aiBusyRef = useRef(false)

  const table = tableRef.current
  const state = table.getState()
  const lastResult = table.getLastHandResult()
  const you = state.players.find((p) => p.id === 'you')!
  // The freezeout rule is "you win all the chips or you lose" — if you bust,
  // that's an immediate loss even if the two AI opponents still have chips
  // between them and could otherwise keep playing each other forever.
  const youBusted = !state.handInProgress && you.stack <= 0
  const gameOver = table.isGameOver() || youBusted
  const winnerId = table.isGameOver() ? table.getFreezeoutWinnerId() : null
  const dealtFirstHandRef = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode's dev-mode double-invoke: without this,
    // startNewHand() would run twice back to back, silently eating one
    // blind round's worth of chips (contributions get reset by the second
    // call without refunding the stacks the first call already deducted).
    if (dealtFirstHandRef.current) return
    if (!state.handInProgress && !gameOver && table.getLastHandResult() === null) {
      dealtFirstHandRef.current = true
      table.startNewHand()
      rerender()
    }
  }, [])

  useEffect(() => {
    if (!state.handInProgress || !state.actingPlayerId || aiBusyRef.current) return
    const actingPlayer = PLAYERS.find((p) => p.id === state.actingPlayerId)
    if (!actingPlayer || actingPlayer.isHuman) return

    aiBusyRef.current = true
    const timer = setTimeout(() => {
      const ctx = table.getAiContext(actingPlayer.id)
      if (ctx) {
        const action = decideAiAction(ctx, defaultRng)
        table.submitAction(actingPlayer.id, action)
      }
      aiBusyRef.current = false
      rerender()
    }, 550)
    return () => clearTimeout(timer)
    // `tick` (not the shallow game fields) drives re-evaluation: actingPlayerId/pot
    // can coincidentally repeat across genuinely different states (e.g. two hands
    // where the same player faces the same pot size), which would make React skip
    // re-running this effect and silently stall the AI turn.
  }, [tick])

  const yourHole = table.getHoleCards('you')
  const legalActions = table.getLegalActions('you')
  const canAct = state.actingPlayerId === 'you'

  const act = (type: 'fold' | 'check' | 'call') => {
    table.submitAction('you', { type })
    rerender()
  }
  const raiseTo = (to: number) => {
    table.submitAction('you', { type: 'raise', to })
    rerender()
  }

  if (gameOver) {
    const youWon = winnerId === 'you'
    return (
      <Overlay>
        <h2>{youWon ? 'You cleaned out the table.' : "You're out of chips."}</h2>
        <p>{youWon ? 'Everyone else is tapped out — the game is yours.' : 'Poker night restarts from the top.'}</p>
        <button
          style={buttonStyle}
          onClick={() => {
            if (youWon) {
              onWin()
            } else {
              tableRef.current = createTable()
              tableRef.current.startNewHand()
              rerender()
            }
          }}
        >
          {youWon ? 'Head out' : 'Try again'}
        </button>
      </Overlay>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d1b12', color: '#e8e8f0', fontFamily: 'monospace', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div data-testid="pot-value" data-pot={state.pot} style={{ marginBottom: 8 }}>Pot: {state.pot}</div>
        <div>
          {state.board.map((c, i) => <Card key={i} card={c} />)}
          {Array.from({ length: 5 - state.board.length }).map((_, i) => <Card key={`hidden-${i}`} faceDown />)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
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
          </div>
        ))}
      </div>

      {!state.handInProgress && (
        <Overlay>
          <h3>Hand #{lastResult?.handNumber} complete</h3>
          {lastResult?.pots.map((pot, i) => (
            <p key={i}>
              {pot.winnerIds.map((id) => PLAYERS.find((pl) => pl.id === id)?.name).join(', ')} won {pot.amount}
            </p>
          ))}
          <button
            style={buttonStyle}
            onClick={() => {
              table.startNewHand()
              rerender()
            }}
          >
            Next hand
          </button>
        </Overlay>
      )}

      {state.handInProgress && canAct && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          {legalActions.some((a) => a.type === 'fold') && (
            <button style={buttonStyle} onClick={() => act('fold')}>Fold</button>
          )}
          {legalActions.some((a) => a.type === 'check') && (
            <button style={buttonStyle} onClick={() => act('check')}>Check</button>
          )}
          {legalActions.some((a) => a.type === 'call') && (
            <button style={buttonStyle} onClick={() => act('call')}>Call {state.currentBet - you.streetContribution}</button>
          )}
          {legalActions.some((a) => a.type === 'raise') && (
            <>
              <button style={buttonStyle} onClick={() => raiseTo(state.minRaiseTo)}>Raise to {state.minRaiseTo}</button>
              <button style={buttonStyle} onClick={() => raiseTo(you.streetContribution + you.stack)}>All in</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      background: 'rgba(5,5,10,0.85)', color: '#e8e8f0', fontFamily: 'monospace', textAlign: 'center',
    }}>
      {children}
    </div>
  )
}

const buttonStyle = {
  background: '#3a9d5c', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: 14,
} as const
