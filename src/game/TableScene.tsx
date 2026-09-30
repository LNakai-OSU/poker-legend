import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction, estimateEquity } from '../engine/ai'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import type { TableDef } from '../world/types'
import { PokerTableView } from './PokerTableView'
import type { GameState } from './state'
import { playSound } from '../audio/audio'
import { useAmbientMusic } from '../audio/SoundToggle'

export interface SessionResult {
  chipsCashedOut: number
  handsWon: number
  biggestPot: number
  /** Only set for a finale table. */
  finaleWon?: boolean
}

interface TableSceneProps {
  table: TableDef
  state: GameState
  /** Deducts a further buy-in from the wallet without leaving (cash games only). */
  onRebuy: (amount: number) => void
  onLeave: (result: SessionResult) => void
}

function buildPlayers(table: TableDef): PlayerConfig[] {
  return [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: table.buyIn },
    ...table.opponents.map((opponent) => ({
      id: opponent.id,
      name: opponent.name,
      isHuman: false,
      skillTier: opponent.skillTier,
      archetype: opponent.archetype,
      startingStack: Math.round(table.buyIn * (opponent.stackMultiplier ?? 1)),
    })),
  ]
}

export function TableScene({ table, state, onRebuy, onLeave }: TableSceneProps) {
  const players = useMemo(() => buildPlayers(table), [table])
  const tableRef = useRef(
    new TexasHoldEmTable(players, {
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      rng: defaultRng,
    }),
  )
  const [tick, setTick] = useState(0)
  const rerender = () => setTick((t) => t + 1)
  const aiBusyRef = useRef(false)
  const dealtFirstHandRef = useRef(false)

  // Session totals reported back when the player leaves.
  const handsWonRef = useRef(0)
  const biggestPotRef = useRef(0)
  const countedHandRef = useRef(0)

  useAmbientMusic('table')

  const engine = tableRef.current
  const publicState = engine.getState()
  const lastResult = engine.getLastHandResult()
  const you = publicState.players.find((p) => p.id === 'you')!
  const youBusted = !publicState.handInProgress && you.stack <= 0
  const isFinale = table.isFinale === true
  const opponentsBusted =
    !publicState.handInProgress && publicState.players.filter((p) => p.id !== 'you').every((p) => p.stack <= 0)

  // Tally results once per completed hand.
  if (lastResult && lastResult.handNumber !== countedHandRef.current && !publicState.handInProgress) {
    countedHandRef.current = lastResult.handNumber
    const wonAnything = lastResult.pots.some((pot) => pot.winnerIds.includes('you'))
    for (const pot of lastResult.pots) {
      if (pot.winnerIds.includes('you')) {
        handsWonRef.current += 1
        biggestPotRef.current = Math.max(biggestPotRef.current, pot.amount)
      }
    }
    playSound(wonAnything ? 'win' : 'lose')
  }

  const rebuyOpponents = () => {
    if (isFinale) return
    for (const opponent of table.opponents) {
      const current = engine.getState().players.find((p) => p.id === opponent.id)
      if (current && current.stack <= 0) {
        engine.rebuy(opponent.id, Math.round(table.buyIn * (opponent.stackMultiplier ?? 1)))
      }
    }
  }

  useEffect(() => {
    // Guard against React StrictMode's dev-mode double-invoke, which would
    // otherwise deal twice and eat a blind round's chips.
    if (dealtFirstHandRef.current) return
    if (!publicState.handInProgress && engine.getLastHandResult() === null) {
      dealtFirstHandRef.current = true
      engine.startNewHand()
      playSound('deal')
      rerender()
    }
  }, [])

  useEffect(() => {
    if (!publicState.handInProgress || !publicState.actingPlayerId || aiBusyRef.current) return
    const actingPlayer = players.find((p) => p.id === publicState.actingPlayerId)
    if (!actingPlayer || actingPlayer.isHuman) return

    aiBusyRef.current = true
    const timer = setTimeout(() => {
      const ctx = engine.getAiContext(actingPlayer.id)
      if (ctx) {
        const action = decideAiAction(ctx, defaultRng)
        playSound(action.type === 'fold' ? 'fold' : action.type === 'check' ? 'check' : 'chip')
        engine.submitAction(actingPlayer.id, action)
      }
      aiBusyRef.current = false
      rerender()
    }, 500)
    return () => clearTimeout(timer)
    // `tick` drives this rather than the shallow game fields, which can repeat
    // across genuinely different states and silently stall the AI's turn.
  }, [tick])

  const yourHole = engine.getHoleCards('you')
  const legalActions = engine.getLegalActions('you')
  const canAct = publicState.actingPlayerId === 'you'
  const toCall = publicState.currentBet - you.streetContribution

  const insights = {
    showPositions: state.lessonIds.includes('position'),
    sharpEyes: state.lessonIds.includes('tells'),
  }

  // Equity is a Monte Carlo run, so only compute it when the read is actually
  // on screen and the inputs have changed.
  const opponentsInHand = publicState.players.filter((p) => p.id !== 'you' && !p.folded).length
  const handRead = useMemo(() => {
    if (!state.lessonIds.includes('hand-reading')) return null
    if (!publicState.handInProgress || yourHole.length < 2) return null
    const equity = estimateEquity(yourHole, publicState.board, Math.max(1, opponentsInHand), defaultRng, 200)
    const made =
      publicState.board.length >= 3
        ? HAND_CATEGORY_NAMES[bestHand([...yourHole, ...publicState.board]).category]
        : 'Pre-flop'
    return { made, equity }
  }, [
    yourHole.map((c) => `${c.rank}${c.suit}`).join(),
    publicState.board.map((c) => `${c.rank}${c.suit}`).join(),
    opponentsInHand,
    publicState.handInProgress,
  ])

  const potOdds =
    state.lessonIds.includes('pot-odds') && toCall > 0
      ? { toCall, breakEven: toCall / (publicState.pot + toCall) }
      : null

  const act = (type: 'fold' | 'check' | 'call') => {
    playSound(type === 'call' ? 'chip' : type)
    engine.submitAction('you', { type })
    rerender()
  }
  const raiseTo = (to: number) => {
    playSound('chip')
    engine.submitAction('you', { type: 'raise', to })
    rerender()
  }

  const leaveWith = (chips: number, finaleWon?: boolean) =>
    onLeave({
      chipsCashedOut: chips,
      handsWon: handsWonRef.current,
      biggestPot: biggestPotRef.current,
      finaleWon,
    })

  // --- Finale outcomes: heads-up, winner takes everything on the table -------
  if (isFinale && opponentsBusted) {
    return (
      <Overlay>
        <h2>You take the last pot.</h2>
        <p>Nadia pushes her chair back, looks at you for a long moment, and offers her hand.</p>
        <button style={buttonStyle} onClick={() => leaveWith(you.stack, true)}>Take the room</button>
      </Overlay>
    )
  }
  if (isFinale && youBusted) {
    return (
      <Overlay>
        <h2>She has them all.</h2>
        <p>Nadia stacks your last chips without ceremony. The penthouse stays hers.</p>
        <button style={buttonStyle} onClick={() => leaveWith(0, false)}>Leave the room</button>
      </Overlay>
    )
  }

  // --- Cash game: bust means rebuy or walk ----------------------------------
  if (youBusted) {
    const canRebuy = state.cash >= table.buyIn
    return (
      <Overlay>
        <h2>You&rsquo;re out of chips at this table.</h2>
        <p>Wallet: ${state.cash.toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {canRebuy && (
            <button
              style={buttonStyle}
              onClick={() => {
                engine.rebuy('you', table.buyIn)
                rebuyOpponents()
                engine.startNewHand()
                onRebuy(table.buyIn)
                rerender()
              }}
            >
              Rebuy (${table.buyIn.toLocaleString()})
            </button>
          )}
          <button style={buttonStyle} onClick={() => leaveWith(0)}>Leave table</button>
        </div>
      </Overlay>
    )
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0d1420', color: '#e8e8f0', fontFamily: 'monospace', padding: 'clamp(10px, 3vw, 24px)', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div>{table.name} &middot; ${table.smallBlind}/${table.bigBlind}</div>
        <div>Wallet: ${state.cash.toLocaleString()}</div>
      </div>

      <PokerTableView
        state={publicState}
        lastResult={lastResult}
        players={players}
        yourHole={yourHole}
        insights={insights}
      />

      {(potOdds || handRead) && (
        <div style={{ textAlign: 'center', marginBottom: 12, color: '#8ad4ff', fontSize: 13 }}>
          {handRead && (
            <div data-testid="hand-read">
              {handRead.made} &middot; ~{Math.round(handRead.equity * 100)}% to win
            </div>
          )}
          {potOdds && (
            <div data-testid="pot-odds">
              Calling {potOdds.toCall} into {publicState.pot} &mdash; you need{' '}
              {Math.round(potOdds.breakEven * 100)}% to break even
            </div>
          )}
        </div>
      )}

      {!publicState.handInProgress && (
        <Overlay>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={buttonStyle}
              onClick={() => {
                rebuyOpponents()
                engine.startNewHand()
                playSound('deal')
                rerender()
              }}
            >
              Next hand
            </button>
            {!isFinale && (
              <button style={buttonStyle} onClick={() => leaveWith(you.stack)}>
                Leave table (cash out ${you.stack.toLocaleString()})
              </button>
            )}
          </div>
        </Overlay>
      )}

      {publicState.handInProgress && canAct && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {legalActions.some((a) => a.type === 'fold') && (
            <button style={buttonStyle} onClick={() => act('fold')}>Fold</button>
          )}
          {legalActions.some((a) => a.type === 'check') && (
            <button style={buttonStyle} onClick={() => act('check')}>Check</button>
          )}
          {legalActions.some((a) => a.type === 'call') && (
            <button style={buttonStyle} onClick={() => act('call')}>Call {toCall}</button>
          )}
          {legalActions.some((a) => a.type === 'raise') && (
            <>
              <button style={buttonStyle} onClick={() => raiseTo(publicState.minRaiseTo)}>
                Raise to {publicState.minRaiseTo}
              </button>
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
      alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24,
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
