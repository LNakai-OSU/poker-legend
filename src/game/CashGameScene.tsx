import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction } from '../engine/ai'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import { PokerTableView } from './PokerTableView'

const BUY_IN = 100
const BLINDS = { smallBlind: 1, bigBlind: 2 }

const OPPONENTS: PlayerConfig[] = [
  { id: 'ray', name: 'Ray', isHuman: false, skillTier: 'novice', startingStack: BUY_IN },
  { id: 'sully', name: 'Sully', isHuman: false, skillTier: 'amateur', startingStack: BUY_IN },
]

function makePlayers(): PlayerConfig[] {
  return [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: BUY_IN },
    ...OPPONENTS,
  ]
}

function createTable() {
  return new TexasHoldEmTable(makePlayers(), { ...BLINDS, rng: defaultRng })
}

interface CashGameSceneProps {
  wallet: number
  /** Deducts a buy-in from the wallet without leaving the table. */
  onRebuy: () => void
  /** Leaves the table, cashing out the given chip amount into the wallet. */
  onLeaveTable: (chipsCashedOut: number) => void
}

export function CashGameScene({ wallet, onRebuy, onLeaveTable }: CashGameSceneProps) {
  const tableRef = useRef(createTable())
  const [tick, setTick] = useState(0)
  const rerender = () => setTick((t) => t + 1)
  const aiBusyRef = useRef(false)
  const dealtFirstHandRef = useRef(false)
  const walletRef = useRef(wallet)
  walletRef.current = wallet

  const table = tableRef.current
  const state = table.getState()
  const lastResult = table.getLastHandResult()
  const you = state.players.find((p) => p.id === 'you')!
  const youBusted = !state.handInProgress && you.stack <= 0

  const rebuyAiOpponents = () => {
    for (const opp of OPPONENTS) {
      const current = table.getState().players.find((p) => p.id === opp.id)
      if (current && current.stack <= 0) table.rebuy(opp.id, BUY_IN)
    }
  }

  useEffect(() => {
    if (dealtFirstHandRef.current) return
    if (!state.handInProgress && table.getLastHandResult() === null) {
      dealtFirstHandRef.current = true
      table.startNewHand()
      rerender()
    }
  }, [])

  useEffect(() => {
    if (!state.handInProgress || !state.actingPlayerId || aiBusyRef.current) return
    const actingPlayer = makePlayers().find((p) => p.id === state.actingPlayerId)
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

  if (youBusted) {
    const canRebuy = walletRef.current >= BUY_IN
    return (
      <Overlay>
        <h2>You're out of chips at this table.</h2>
        <p>Wallet: ${walletRef.current}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {canRebuy && (
            <button
              style={buttonStyle}
              onClick={() => {
                table.rebuy('you', BUY_IN)
                rebuyAiOpponents()
                table.startNewHand()
                onRebuy()
                rerender()
              }}
            >
              Rebuy (${BUY_IN})
            </button>
          )}
          <button style={buttonStyle} onClick={() => onLeaveTable(0)}>Leave table</button>
        </div>
      </Overlay>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d1420', color: '#e8e8f0', fontFamily: 'monospace', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>Wallet: ${walletRef.current}</div>
      <PokerTableView state={state} lastResult={lastResult} players={makePlayers()} yourHole={yourHole} />

      {!state.handInProgress && (
        <Overlay>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={buttonStyle}
              onClick={() => {
                rebuyAiOpponents()
                table.startNewHand()
                rerender()
              }}
            >
              Next hand
            </button>
            <button style={buttonStyle} onClick={() => onLeaveTable(you.stack)}>
              Leave table (cash out ${you.stack})
            </button>
          </div>
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

export { BUY_IN }
