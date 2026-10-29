import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable } from '../engine/table'
import { decideAiAction } from '../engine/ai'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import { useTouchFirst } from './device'
import { useBetKeys, type BetStop } from './useBetKeys'
import { describeHold } from './handHint'
import { PokerTableView, ShowdownSummary } from './PokerTableView'
import type { Announcement } from './HandAnnouncer'
import { playSound } from '../audio/audio'
import { TableStage } from './TableStage'
import { DOCK, buttonHeight, type SceneLayout, type SceneNeeds } from './tableLayout'
import { TABLE_THEMES } from './tableThemes'
import { Panel, PxButton, PxLine } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { useActionTags } from './actionTag'
import { describeAction, LOG_LINES } from './actionLog'

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
const ANNOUNCE_MS = 2600
/** Blinds going up gets longer: it changes what every bet means. */
const BLINDS_MS = 4500
/** Under the betting buttons, for a player with a keyboard. */
const BET_KEYS_HINT = '← → choose · ↑ ↓ bet size · Space confirm'

function createTable() {
  return new TexasHoldEmTable(PLAYERS, {
    smallBlind: BLIND_LEVELS[0].small,
    bigBlind: BLIND_LEVELS[0].big,
    rng: defaultRng,
  })
}

interface PokerNightSceneProps {
  onWin: (winnings: number) => void
  /** Walk away from the game. There was previously no way out of this scene. */
  onLeave?: () => void
}

export function PokerNightScene({ onWin, onLeave }: PokerNightSceneProps) {
  const tableRef = useRef(createTable())
  const [tick, setTick] = useState(0)
  /** The last few things anybody did this hand, narrated in the betting menu. */
  const [showHeld, setShowHeld] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const note = (line: string) => setLog((lines) => [...lines.slice(1 - LOG_LINES), line])
  const rerender = () => setTick((t) => t + 1)
  const aiBusyRef = useRef(false)

  const table = tableRef.current
  const state = table.getState()
  const { tags: actionTags, record: recordAction } = useActionTags(state.handNumber, state.street)
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
  const announce = (a: Announcement, ms = ANNOUNCE_MS) => {
    setAnnouncement(a)
    if (announceTimer.current) window.clearTimeout(announceTimer.current)
    announceTimer.current = window.setTimeout(() => setAnnouncement(null), ms)
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
    setShowHeld(false)
    table.startNewHand()
    setLog([])
    playSound('deal')
    if (level.index !== current.index || next === 1) {
      announce({
        key: `blinds-${next}`,
        text: next === 1 ? `Blinds ${level.small}/${level.big}` : `Blinds up: ${level.small}/${level.big}`,
        detail: level.index === BLIND_LEVELS.length - 1 ? 'last level' : 'every bet costs more now',
        tone: level.index >= 3 ? 'tense' : 'neutral',
      }, BLINDS_MS)
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
        note(describeAction(actingPlayer.name, action, ctx))
        recordAction(actingPlayer.id, action, ctx)
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

  // Between hands the board stays up until the player asks for the next deal.
  const handOver = !state.handInProgress && lastResult !== null && !gameOver
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
    note(describeAction('You', { type }, { toCall, allInTo }))
    recordAction('you', { type }, { toCall, allInTo })
    table.submitAction('you', { type })
    rerender()
  }
  const raiseTo = (to: number) => {
    playSound('chip')
    note(describeAction('You', { type: 'raise', to }, { toCall, allInTo }))
    recordAction('you', { type: 'raise', to }, { toCall, allInTo })
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

  const level = levelFor(state.handNumber)
  const youWon = winnerId === 'you'

  // The same keys as every other table: arrows pick, Space does it.
  const betStops: BetStop[] = [
    ...(legalActions.some((a) => a.type === 'fold') ? (['fold'] as const) : []),
    ...(legalActions.some((a) => a.type === 'check') ? (['check'] as const) : []),
    ...(legalActions.some((a) => a.type === 'call') ? (['call'] as const) : []),
    ...(legalActions.some((a) => a.type === 'raise') ? (['raise'] as const) : []),
  ]
  const betSizes = [...(state.minRaiseTo < allInTo ? [state.minRaiseTo, ...raisePresets.map((p) => p.to)] : []), allInTo]
  const [raiseSize, setRaiseSize] = useState(0)
  const betSize = Math.min(Math.max(raiseSize, state.minRaiseTo), allInTo)
  const betCursor = useBetKeys({
    active: canAct && state.handInProgress && !gameOver,
    stops: betStops,
    sizes: betSizes,
    size: betSize,
    setSize: setRaiseSize,
    resetKey: `${state.handNumber}-${state.street}-${state.currentBet}`,
    onPick: (stop) => (stop === 'raise' ? raiseTo(betSize) : act(stop)),
  })
  const touch = useTouchFirst()

  const needs = useMemo<SceneNeeds>(
    () => ({
      kind: 'home',
      opponents: PLAYERS.length - 1,
      sampleAmount: (STARTING_STACK * PLAYERS.length).toLocaleString(),
      infoTexts: [...(touch ? [] : [BET_KEYS_HINT]), LONGEST_COACHING, 'You hold a pair of Queens — a double. A strong start.'],
      title: "Marcus's kitchen table · winner takes all",
      subtitle: `Blinds ${level.small}/${level.big} · hand ${state.handNumber}`,
    }),
    [level.small, level.big, state.handNumber, touch],
  )

  const dock = (layout: SceneLayout) => {
    const P = layout.scale * layout.dockZoom
    const one = buttonHeight(1, P, layout.coarse)
    const plan = layout.dockPlan
    const row = { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', alignItems: 'center', gap: DOCK.gap * P }

    let body: ReactNode = null
    if (gameOver) {
      // The result sits under the table, not over it. A full-screen overlay threw
      // away the showdown that just busted you — and since most first attempts
      // end here, that was the one hand the player most needed to see.
      body = (
        <div
          data-testid={youWon ? 'home-game-won' : 'home-game-lost'}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * P }}
        >
          <h2 style={{ margin: 0, lineHeight: 0 }}>
            <PixelText
              text={youWon ? 'You cleaned out the table.' : "They've got all your chips."}
              scale={P}
              ink={{ color: THEME.ui.outline, shadow: THEME.ui.band }}
            />
          </h2>
          <PxLine
            scale={P}
            wrap
            align="center"
            text={youWon ? 'Everyone else is tapped out — the game is yours.' : 'Marcus will deal you back in. The blinds start over.'}
          />
          <div style={row}>
            <PxButton
              lines={[youWon ? 'Head out' : 'Deal me back in']}
              scale={P}
              role="raise"
              height={one}
              onClick={() => {
                if (youWon) {
                  onWin(you.stack)
                } else {
                  tableRef.current = createTable()
                  tableRef.current.startNewHand()
                  rerender()
                }
              }}
            />
            {!youWon && (
              // There was no way to leave the home game at all, at any point.
              <PxButton lines={['Step outside']} scale={P} role="plain" height={one} onClick={() => onLeave?.()} />
            )}
          </div>
        </div>
      )
    } else if (handOver) {
      body = (
        <>
          {lastResult && <ShowdownSummary result={lastResult} players={PLAYERS} scale={P} />}
          <div data-testid="hand-over-bar" style={{ ...row, marginTop: DOCK.gap * P }}>
            {lastResult?.held?.some((h) => h.playerId !== 'you') && !showHeld && (
              <PxButton lines={['See their cards']} scale={P} role="plain" height={one} onClick={() => setShowHeld(true)} />
            )}
            <PxButton lines={['Next hand (space)']} scale={P} role="primary" height={one} onClick={dealNextHand} />
          </div>
        </>
      )
    } else {
      const raiseOpen = legalActions.some((a) => a.type === 'raise')
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: DOCK.gap * P }}>
          {state.handInProgress && yourHole.length === 2 && (
            <div data-testid="hand-hint">
              <PixelText text={describeHold(yourHole, state.board) ?? ''} scale={P} ink={{ color: '#2a6a3a', shadow: '#cfe8d4' }} wrap />
            </div>
          )}
          {coaching && (
            <div data-testid="coaching">
              <PixelText text={coaching} scale={P} ink={{ color: '#2a5a9a', shadow: '#c8d8f0' }} wrap />
            </div>
          )}
          {state.handInProgress && canAct && (
            <>
              <div style={row}>
                {legalActions.some((a) => a.type === 'fold') && (
                  <PxButton lines={['Fold']} scale={P} role="fold" height={one} selected={betCursor === 'fold'} onClick={() => act('fold')} />
                )}
                {legalActions.some((a) => a.type === 'check') && (
                  <PxButton lines={['Check']} scale={P} role="primary" height={one} selected={betCursor === 'check'} onClick={() => act('check')} />
                )}
                {legalActions.some((a) => a.type === 'call') && (
                  <PxButton lines={[`Call ${toCall}`]} scale={P} role="primary" height={one} selected={betCursor === 'call'} onClick={() => act('call')} />
                )}
              </div>
              {raiseOpen && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${plan.sizingCols}, ${plan.sizingCellW * P}px)`,
                    justifyContent: 'center',
                    gap: DOCK.gap * P,
                  }}
                >
                  {state.minRaiseTo < allInTo && (
                    <PxButton
                      lines={[`Raise to ${state.minRaiseTo}`]}
                      scale={P}
                      role="raise"
                      width={plan.sizingCellW}
                      height={one}
                      selected={betCursor === 'raise' && betSize === state.minRaiseTo}
                      onClick={() => raiseTo(state.minRaiseTo)}
                    />
                  )}
                  {raisePresets.map((preset) => (
                    <PxButton
                      key={preset.label}
                      lines={[`${preset.label} (${preset.to})`]}
                      scale={P}
                      role="raise"
                      width={plan.sizingCellW}
                      height={one}
                      selected={betCursor === 'raise' && betSize === preset.to}
                      onClick={() => raiseTo(preset.to)}
                    />
                  ))}
                  <PxButton
                    lines={[`All in (${allInTo})`]}
                    scale={P}
                    role="allin"
                    width={plan.sizingCellW}
                    height={one}
                    selected={betCursor === 'raise' && betSize === allInTo}
                    onClick={() => raiseTo(allInTo)}
                  />
                </div>
              )}
              {!touch && (
                <PxLine scale={P} align="center" ink={{ color: '#8a8a98', shadow: '#dcdce4' }} testId="bet-keys-hint" text={BET_KEYS_HINT} />
              )}
            </>
          )}
          {state.handInProgress && !canAct && (
            <>
              {!coaching && (
                <div data-testid="action-log">
                  {log.map((line, i) => (
                    <PxLine
                      key={`${i}-${line}`}
                      scale={P}
                      text={line}
                      ink={i === log.length - 1 ? INK.dark : { color: '#8a8a98', shadow: '#dcdce4' }}
                    />
                  ))}
                </div>
              )}
              <PxLine
                scale={P}
                align="center"
                ink={{ color: '#2a5a9a', shadow: '#c8d8f0' }}
                text={`${PLAYERS.find((p) => p.id === state.actingPlayerId)?.name ?? 'The dealer'} to act…`}
              />
            </>
          )}
        </div>
      )
    }

    return (
      <Panel
        theme={THEME}
        scale={P}
        testId="dock"
        style={{
          minHeight: layout.dock.h * layout.scale,
          padding: 3 * P,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: DOCK.gap * P,
        }}
      >
        {body}
      </Panel>
    )
  }

  return (
    <TableStage
      theme={THEME}
      needs={needs}
      felt={(layout) => (
        <PokerTableView
          blinds={levelFor(Math.max(1, state.handNumber))}
          showHeld={showHeld}
          actionTags={actionTags}
          state={state}
          lastResult={lastResult}
          yourHole={yourHole}
          announcement={announcement}
          layout={layout}
          theme={THEME}
        />
      )}
      dock={dock}
    />
  )
}

const THEME = TABLE_THEMES.home

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

/** The longest thing Marcus says, which the menu keeps room for. */
const LONGEST_COACHING =
  "Marcus: Everyone posts a blind to start — that's the 250 sitting in front of you to match. Call it, raise it, or throw the hand away."
