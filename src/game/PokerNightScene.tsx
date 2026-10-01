import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction } from '../engine/ai'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import { PokerTableView } from './PokerTableView'
import type { Announcement } from './HandAnnouncer'
import { playSound } from '../audio/audio'

/**
 * Marcus's kitchen table: the first hand of poker the player ever sees, and the
 * gate on the whole game.
 *
 * It used to be a 1,500-chip freezeout at fixed 5/10 blinds with no instruction of
 * any kind, a full-screen modal to dismiss after every single hand, and only two
 * betting options (minimum raise, or all in) — neither of which is how the real
 * tables work. Playtested cold it was lost six times out of six at a median of
 * 205 hands, which is half an hour of clicking through modals to arrive back at
 * the start. Now: the blinds go up so it ends, the controls are the ones the game
 * actually uses, the next hand deals itself, and somebody tells you what is
 * happening.
 */

const STARTING_STACK = 500

const PLAYERS: PlayerConfig[] = [
  { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: STARTING_STACK },
  { id: 'marcus', name: 'Marcus', isHuman: false, skillTier: 'novice', startingStack: STARTING_STACK },
  { id: 'dana', name: 'Dana', isHuman: false, skillTier: 'novice', startingStack: STARTING_STACK },
]

/**
 * The blind structure. Each level lasts `handsPerLevel`, and by the last one the
 * blinds are a quarter of the chips in play, so somebody has to win soon.
 */
const BLIND_LEVELS: { small: number; big: number }[] = [
  { small: 5, big: 10 },
  { small: 10, big: 20 },
  { small: 20, big: 40 },
  { small: 40, big: 80 },
  { small: 75, big: 150 },
  { small: 125, big: 250 },
]
const HANDS_PER_LEVEL = 6

function levelFor(handNumber: number) {
  const index = Math.min(BLIND_LEVELS.length - 1, Math.floor((handNumber - 1) / HANDS_PER_LEVEL))
  return { ...BLIND_LEVELS[index], index }
}

/** How long the next hand waits before dealing itself. */
const AUTO_DEAL_MS = 3000
const ANNOUNCE_MS = 2600

function createTable() {
  return new TexasHoldEmTable(PLAYERS, {
    smallBlind: BLIND_LEVELS[0].small,
    bigBlind: BLIND_LEVELS[0].big,
    rng: defaultRng,
  })
}

interface PokerNightSceneProps {
  onWin: (winnings: number) => void
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

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const announceTimer = useRef<number | null>(null)
  const announce = (a: Announcement) => {
    setAnnouncement(a)
    if (announceTimer.current) window.clearTimeout(announceTimer.current)
    announceTimer.current = window.setTimeout(() => setAnnouncement(null), ANNOUNCE_MS)
  }
  useEffect(
    () => () => {
      if (announceTimer.current) window.clearTimeout(announceTimer.current)
    },
    [],
  )

  /** Raises the blinds for the hand about to be dealt, and says so. */
  const dealNextHand = () => {
    const next = state.handNumber + 1
    const level = levelFor(next)
    const current = levelFor(Math.max(1, state.handNumber))
    table.setBlinds(level.small, level.big)
    table.startNewHand()
    playSound('deal')
    if (level.index !== current.index || next === 1) {
      announce({
        key: `blinds-${next}`,
        text: `Blinds ${level.small}/${level.big}`,
        detail: level.index === BLIND_LEVELS.length - 1 ? 'last level' : 'they go up every few hands',
        tone: level.index >= 3 ? 'tense' : 'neutral',
      })
    }
    rerender()
  }

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
        playSound(action.type === 'fold' ? 'fold' : action.type === 'check' ? 'check' : 'chip')
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

  // Between hands, deal the next one rather than waiting to be asked.
  const handOver = !state.handInProgress && lastResult !== null && !gameOver
  const [holding, setHolding] = useState(false)
  useEffect(() => {
    if (!handOver || holding) return
    const timer = window.setTimeout(dealNextHand, AUTO_DEAL_MS)
    return () => window.clearTimeout(timer)
  }, [handOver, holding, lastResult?.handNumber])

  useEffect(() => {
    if (!handOver) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      dealNextHand()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handOver, lastResult?.handNumber])

  const yourHole = table.getHoleCards('you')
  const legalActions = table.getLegalActions('you')
  const canAct = state.actingPlayerId === 'you'
  const toCall = state.currentBet - you.streetContribution
  const allInTo = you.streetContribution + you.stack

  const act = (type: 'fold' | 'check' | 'call') => {
    playSound(type === 'call' ? 'chip' : type)
    table.submitAction('you', { type })
    rerender()
  }
  const raiseTo = (to: number) => {
    playSound('chip')
    table.submitAction('you', { type: 'raise', to })
    rerender()
  }

  // The same pot-fraction sizings the real tables offer, so the tutorial teaches
  // the controls the rest of the game actually uses.
  const raisePresets = (
    [
      { label: '½ pot', fraction: 0.5 },
      { label: 'Pot', fraction: 1 },
    ] as const
  )
    .map(({ label, fraction }) => ({
      label,
      to: state.currentBet + Math.round((state.pot + toCall) * fraction),
    }))
    .filter((preset) => preset.to > state.minRaiseTo && preset.to < allInTo)

  const coaching = coachingFor({
    street: state.street,
    handNumber: state.handNumber,
    canAct,
    toCall,
    board: state.board.length,
    yourStack: you.stack,
    bigBlind: levelFor(state.handNumber).big,
  })

  if (gameOver) {
    const youWon = winnerId === 'you'
    return (
      <Overlay>
        <h2>{youWon ? 'You cleaned out the table.' : "They've got all your chips."}</h2>
        <p>
          {youWon
            ? 'Everyone else is tapped out — the game is yours.'
            : 'Marcus deals you back in. The blinds start over.'}
        </p>
        <button
          style={buttonStyle}
          onClick={() => {
            if (youWon) {
              onWin(you.stack)
            } else {
              tableRef.current = createTable()
              tableRef.current.startNewHand()
              setHolding(false)
              rerender()
            }
          }}
        >
          {youWon ? 'Head out' : 'Deal me back in'}
        </button>
      </Overlay>
    )
  }

  const level = levelFor(state.handNumber)

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0d1b12',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        padding: 'clamp(10px, 3vw, 24px)',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 13 }}>
        <div>Marcus's kitchen table &middot; winner takes all</div>
        <div style={{ color: '#9a9ab0' }}>
          Blinds {level.small}/{level.big} &middot; hand {state.handNumber}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <PokerTableView
          state={state}
          lastResult={lastResult}
          players={PLAYERS}
          yourHole={yourHole}
          announcement={announcement}
        />
      </div>

      {coaching && (
        <div
          data-testid="coaching"
          style={{
            maxWidth: 560,
            margin: '0 auto',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #2f6ea8',
            background: 'rgba(16,30,46,0.9)',
            color: '#bcd8f0',
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {coaching}
        </div>
      )}

      {handOver && (
        <div
          data-testid="hand-over-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(8,16,12,0.9)',
            border: '1px solid #26402f',
            fontSize: 12,
            color: '#9ab0a0',
          }}
        >
          {holding ? (
            <>
              <span data-testid="auto-deal-status">Holding</span>
              <button
                style={smallButtonStyle}
                onClick={() => {
                  setHolding(false)
                  dealNextHand()
                }}
              >
                Next hand (space)
              </button>
            </>
          ) : (
            <>
              <span data-testid="auto-deal-status">Next hand</span>
              <span
                style={{
                  position: 'relative',
                  width: 90,
                  height: 3,
                  borderRadius: 2,
                  background: '#26402f',
                  overflow: 'hidden',
                }}
              >
                <span
                  key={lastResult?.handNumber}
                  className="deal-countdown"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#f2c14e',
                    animationDuration: `${AUTO_DEAL_MS}ms`,
                  }}
                />
              </span>
              <button style={smallButtonStyle} onClick={dealNextHand}>
                Deal now (space)
              </button>
              <button style={smallButtonStyle} onClick={() => setHolding(true)}>
                Hold
              </button>
            </>
          )}
        </div>
      )}

      {state.handInProgress && canAct && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {legalActions.some((a) => a.type === 'fold') && (
            <button style={foldButtonStyle} onClick={() => act('fold')}>
              Fold
            </button>
          )}
          {legalActions.some((a) => a.type === 'check') && (
            <button style={primaryButtonStyle} onClick={() => act('check')}>
              Check
            </button>
          )}
          {legalActions.some((a) => a.type === 'call') && (
            <button style={primaryButtonStyle} onClick={() => act('call')}>
              Call {toCall}
            </button>
          )}
          {legalActions.some((a) => a.type === 'raise') && (
            <>
              {state.minRaiseTo < allInTo && (
                <button style={buttonStyle} onClick={() => raiseTo(state.minRaiseTo)}>
                  Raise to {state.minRaiseTo}
                </button>
              )}
              {raisePresets.map((preset) => (
                <button key={preset.label} style={buttonStyle} onClick={() => raiseTo(preset.to)}>
                  {preset.label} ({preset.to})
                </button>
              ))}
              <button style={allInButtonStyle} onClick={() => raiseTo(allInTo)}>
                All in ({allInTo})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * What to tell a player who has never seen a hand of poker, at the moment it
 * matters. Nothing at all was explained before: not the blinds, not the board,
 * not what winning this game means.
 */
function coachingFor(options: {
  street: string
  handNumber: number
  canAct: boolean
  toCall: number
  board: number
  yourStack: number
  bigBlind: number
}): string | null {
  const { street, handNumber, canAct, toCall, board, yourStack, bigBlind } = options

  if (handNumber <= 1 && street === 'preflop' && canAct) {
    return toCall > 0
      ? `Marcus: Everyone posts a blind to start — that's the ${toCall} sitting in front of you to match. Call it, raise it, or throw the hand away.`
      : 'Marcus: Nobody has bet. Check to see the next three cards for nothing, or bet and make them pay.'
  }
  if (handNumber <= 2 && street === 'flop' && canAct) {
    return 'Marcus: Those three in the middle are everyone\'s. Best five cards out of your two and the board takes it.'
  }
  if (handNumber <= 3 && street === 'river' && canAct) {
    return 'Marcus: Last card. No more coming, so what you have is what you have.'
  }
  if (handNumber <= 4 && !canAct && board === 0) {
    return 'Marcus: Winner takes every chip on this table. Lose yours and we start over.'
  }
  if (yourStack > 0 && yourStack < bigBlind * 5 && canAct) {
    return 'Marcus: You are short. At this point you want to get it all in with a decent hand rather than bleed it off.'
  }
  return null
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

const foldButtonStyle = {
  ...buttonStyle,
  background: 'transparent',
  border: '1px solid #4a5160',
  color: '#b8c0cc',
} as const

const primaryButtonStyle = { ...buttonStyle, background: '#2f6ea8' } as const

const allInButtonStyle = {
  ...buttonStyle,
  background: '#a33636',
  border: '1px solid #c95c5c',
} as const

const smallButtonStyle = {
  ...buttonStyle,
  background: 'transparent',
  border: '1px solid #2f5a3f',
  color: '#bcd8c8',
  padding: '4px 10px',
  fontSize: 12,
} as const
