import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction, estimateEquity } from '../engine/ai'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import type { TableDef } from '../world/types'
import { PokerTableView } from './PokerTableView'
import type { GameState } from './state'
import { tableAccess } from './progression'
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

  // Tally results once per completed hand. Only pots actually won count: an
  // uncalled bet coming back is not a hand won and not a pot size.
  if (lastResult && lastResult.handNumber !== countedHandRef.current && !publicState.handInProgress) {
    countedHandRef.current = lastResult.handNumber
    const wonAnything = lastResult.pots.some((pot) => !pot.uncalled && pot.winnerIds.includes('you'))
    for (const pot of lastResult.pots) {
      if (!pot.uncalled && pot.winnerIds.includes('you')) {
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

  // --- Bet sizing -----------------------------------------------------------
  // The AI bets a fraction of the pot, so the player needs the same vocabulary.
  // Overbets are part of that vocabulary and not a luxury: capped at pot, a
  // 1,200bb-deep table offers only a tiny raise or a whole-stack shove, which is
  // exactly what leaves a maximum-sizing opponent unpunishable.
  const allInTo = you.streetContribution + you.stack
  const raisePresets = ([
    { key: 'half', label: '½ pot', fraction: 0.5 },
    { key: 'three-quarter', label: '¾ pot', fraction: 0.75 },
    { key: 'pot', label: 'Pot', fraction: 1 },
    { key: 'pot-1-5', label: '1½× pot', fraction: 1.5 },
    { key: 'pot-2', label: '2× pot', fraction: 2 },
  ] as const)
    .map(({ key, label, fraction }) => ({
      key,
      label,
      // Call first, then bet that fraction of the pot the call makes: the
      // standard pot-fraction raise, expressed as a raise-to total.
      to: publicState.currentBet + Math.round((publicState.pot + toCall) * fraction),
    }))
    // A sizing at or below the legal minimum raise is not that sizing, so it is
    // dropped rather than silently clamped into a mislabelled button — "Min
    // raise" already offers that number. Anything at or past the whole stack goes
    // too, since "All in" covers it.
    .filter(
      (preset, i, all) =>
        preset.to > publicState.minRaiseTo &&
        preset.to < allInTo &&
        all.findIndex((p) => p.to === preset.to) === i,
    )

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

  // --- End-of-session panel -------------------------------------------------
  // Winning, busting and the finale all used to replace the whole table with a
  // full-screen overlay, which hid the one hand the player most wants to read:
  // the showdown that just ended their session. These render as a panel *below*
  // the table instead, so the board and every revealed hand stay on screen.
  const canRebuy = state.cash >= table.buyIn
  const rebuyWarning = tableAccess(state, table).bankrollWarning
  const outcome: ReactNode = (() => {
    if (isFinale && opponentsBusted) {
      return (
        <EndPanel testId="finale-won" title="You take the last pot.">
          <p>Nadia pushes her chair back, looks at you for a long moment, and offers her hand.</p>
          <button style={buttonStyle} onClick={() => leaveWith(you.stack, true)}>Take the room</button>
        </EndPanel>
      )
    }
    if (isFinale && youBusted) {
      return (
        <EndPanel testId="finale-lost" title="She has them all.">
          <p>Nadia stacks your last chips without ceremony. The penthouse stays hers.</p>
          <p style={{ color: '#f2c14e' }}>
            The ${table.buyIn.toLocaleString()} you put up is hers. That was the bet.
          </p>
          <button style={buttonStyle} onClick={() => leaveWith(0, false)}>Leave the room</button>
        </EndPanel>
      )
    }
    if (youBusted) {
      return (
        <EndPanel testId="busted" title="You're out of chips at this table.">
          <p>Wallet: ${state.cash.toLocaleString()}</p>
          {/* Buying back in is buying in again, so the bankroll lesson applies here too. */}
          {canRebuy && rebuyWarning && (
            <p data-testid="rebuy-bankroll-warning" style={{ color: '#f2c14e', maxWidth: 420 }}>
              Bankroll warning: {rebuyWarning}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </EndPanel>
      )
    }
    return null
  })()

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

      {outcome}

      {/* A bar, not a sheet: it sits under the table rather than over it, so the
          revealed hands and the winning pot stay readable while it is up. */}
      {!publicState.handInProgress && outcome === null && (
        <div
          data-testid="hand-over-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
            borderRadius: 8,
            background: '#0a1018',
            border: '1px solid #2c3d5e',
          }}
        >
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
              {publicState.minRaiseTo < allInTo && (
                <button style={sizingButtonStyle} data-testid="raise-min" onClick={() => raiseTo(publicState.minRaiseTo)}>
                  <SizingLabel label="Min raise" to={publicState.minRaiseTo} />
                </button>
              )}
              {raisePresets.map((preset) => (
                <button
                  key={preset.key}
                  style={sizingButtonStyle}
                  data-testid={`raise-${preset.key}`}
                  onClick={() => raiseTo(preset.to)}
                >
                  {/* The first line names the sizing, the second is the total it
                      raises you to. Printing the total *as* the label read
                      "Pot 300" when the pot was 150. */}
                  <SizingLabel label={preset.label} to={preset.to} />
                </button>
              ))}
              <button style={sizingButtonStyle} data-testid="raise-all-in" onClick={() => raiseTo(allInTo)}>
                <SizingLabel label="All in" to={allInTo} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Two lines: what the sizing is, and the total it raises you to. */
function SizingLabel({ label, to }: { label: string; to: number }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.25 }}>
      <span>{label}</span>
      <span style={{ fontSize: '0.85em', opacity: 0.75 }}>to {to.toLocaleString()}</span>
    </span>
  )
}

/**
 * How a session ends. Deliberately a panel and not a full-screen overlay: the
 * hand that ended it is still on the table above, and covering it up hid the one
 * showdown the player most needs to see.
 */
function EndPanel({ testId, title, children }: { testId: string; title: string; children: ReactNode }) {
  return (
    <div
      data-testid={testId}
      style={{
        maxWidth: 680,
        margin: '0 auto 12px',
        padding: 'clamp(12px, 3vw, 20px)',
        borderRadius: 10,
        border: '1px solid #4a4a66',
        background: 'rgba(5,5,10,0.92)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 'clamp(15px, 4vw, 20px)' }}>{title}</h2>
      {children}
    </div>
  )
}

const buttonStyle = {
  background: '#3a9d5c', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: 14,
} as const

/** Tighter, since up to seven sizing buttons have to wrap sanely at 390px. */
const sizingButtonStyle = {
  ...buttonStyle,
  background: '#2f7d4a',
  padding: 'clamp(6px, 2vw, 8px) clamp(8px, 3vw, 14px)',
  fontSize: 'clamp(12px, 3.4vw, 14px)',
} as const
