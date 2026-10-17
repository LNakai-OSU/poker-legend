import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { TexasHoldEmTable, type HandResult } from '../engine/table'
import { decideAiAction, estimateEquity, inferredRangePercentile } from '../engine/ai'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import type { OpponentDef, TableDef } from '../world/types'
import { PokerTableView, ShowdownSummary, handTakings, potWinnerIds, type SeatSpeech } from './PokerTableView'
import type { Announcement } from './HandAnnouncer'
import { personalityFor, seatsOf } from '../world/characters'
import type { GameState } from './state'
import { tableAccess, tellClarity } from './progression'
import { playSound } from '../audio/audio'
import { useAmbientMusic } from '../audio/SoundToggle'
import { TableStage } from './TableStage'
import { DOCK, buttonHeight, buttonWidth, type SceneLayout, type SceneNeeds } from './tableLayout'
import { themeFor, type TableTheme } from './tableThemes'
import { Countdown, Panel, PxButton, PxLine } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { chipTopUrl } from './pixel/chips'
import { describeAction, LOG_LINES } from './actionLog'

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

/** How long an announcement stays up. Matches the `announce` CSS animation. */
const ANNOUNCE_MS = 2600

/**
 * How long the felt is left alone after a hand before the next one is dealt.
 * Long enough to read the board and the hand that beat you, short enough that
 * poker keeps happening without being asked to continue every thirty seconds.
 */
const AUTO_DEAL_MS = 3200

/** How long a line of table talk stays up. */
const SPEECH_MS = 2200

/**
 * An opponent sitting behind less than this share of a buy-in tops back up to one
 * between hands, so the table stays a cash game rather than becoming a mix of
 * short stacks and one huge one.
 */
const TOP_UP_BELOW_FRACTION = 0.6

const STREET_NAMES: Record<string, string> = {
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

/** The one line that says what just happened, for the banner over the felt. */
function resultAnnouncement(
  result: HandResult,
  handNumber: number,
  players: PlayerConfig[],
): Announcement {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id
  const { won, returned } = handTakings(result, 'you')
  const key = `result-${handNumber}`
  const winners = potWinnerIds(result)

  if (won > 0) {
    const yours = result.revealed.find((r) => r.playerId === 'you')
    const made = yours
      ? HAND_CATEGORY_NAMES[bestHand([...yours.holeCards, ...result.board]).category]
      : null
    return {
      key,
      text: `You win ${won.toLocaleString()}`,
      detail: made ?? 'everyone folded',
      tone: 'good',
    }
  }

  const other = [...winners].find((id) => id !== 'you')
  if (other) {
    const theirs = result.revealed.find((r) => r.playerId === other)
    const made = theirs
      ? HAND_CATEGORY_NAMES[bestHand([...theirs.holeCards, ...result.board]).category]
      : null
    const amount = handTakings(result, other).won
    return {
      key,
      // The name is carried by the seat lighting up; this says the size of it.
      text: `${theirs ? 'Beaten by ' : 'Pot to '}${nameOf(other)}`,
      detail: made ? `${made} · ${amount.toLocaleString()}` : amount.toLocaleString(),
      tone: 'bad',
    }
  }

  return {
    key,
    text: returned > 0 ? 'Bet came back uncalled' : 'Hand over',
    tone: 'neutral',
  }
}

function buildPlayers(table: TableDef, seats: OpponentDef[]): PlayerConfig[] {
  return [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: table.buyIn },
    ...seats.map((opponent) => ({
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
  // Who is actually sitting here: the table names characters, and this looks
  // each one up once for the life of the table.
  const seats = useMemo(() => seatsOf(table), [table])
  const players = useMemo(() => buildPlayers(table, seats), [table, seats])
  /** Which of a character's personas has taken this seat, for what they say. */
  const personas = useMemo(
    () => Object.fromEntries(seats.flatMap((s) => (s.persona ? [[s.id, s.persona]] : []))),
    [seats],
  )
  const tableRef = useRef(
    new TexasHoldEmTable(players, {
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      rng: defaultRng,
    }),
  )
  const [tick, setTick] = useState(0)
  const [speech, setSpeech] = useState<SeatSpeech | null>(null)
  /** The last few things anybody did this hand, narrated in the betting menu. */
  const [log, setLog] = useState<string[]>([])
  const note = (line: string) => setLog((lines) => [...lines.slice(1 - LOG_LINES), line])
  const [sliderTo, setSliderTo] = useState(0)
  const speechTimer = useRef<number | null>(null)
  const rerender = () => setTick((t) => t + 1)
  const aiBusyRef = useRef(false)
  const dealtFirstHandRef = useRef(false)

  // Session totals reported back when the player leaves.
  const handsWonRef = useRef(0)
  const biggestPotRef = useRef(0)
  const countedHandRef = useRef(0)

  useAmbientMusic('table')

  /**
   * Opponents talk, but not on every action — constant chatter reads as noise.
   * Lines fire on a fraction of actions and always at a showdown.
   */
  const say = (
    playerId: string,
    kind: 'greeting' | 'raise' | 'bet' | 'check' | 'call' | 'fold' | 'win' | 'lose',
    always = false,
  ) => {
    // Every action clears whatever was on screen, win or lose the roll. Letting a
    // line sit out its own timer meant "HA! Drinks on me!" hung over the next
    // player while they folded, so the characters were visibly out of sync with
    // what they were doing.
    if (speechTimer.current) window.clearTimeout(speechTimer.current)
    setSpeech(null)
    if (!always && Math.random() > 0.45) return
    const pools = personalityFor(playerId, personas[playerId]).lines
    // Betting and checking are the two commonest actions and had no lines at all,
    // so most actions were narrated by whatever was said last.
    const lines = pools[kind] ?? (kind === 'bet' ? pools.raise : undefined)
    if (!lines || lines.length === 0) return
    const text = lines[Math.floor(Math.random() * lines.length)]
    setSpeech({ playerId, text })
    speechTimer.current = window.setTimeout(() => setSpeech(null), SPEECH_MS)
  }

  useEffect(
    () => () => {
      if (speechTimer.current) window.clearTimeout(speechTimer.current)
    },
    [],
  )

  const engine = tableRef.current
  const publicState = engine.getState()
  const lastResult = engine.getLastHandResult()
  const you = publicState.players.find((p) => p.id === 'you')!
  const youBusted = !publicState.handInProgress && you.stack <= 0

  // --- Announcing key moments ----------------------------------------------
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

  // The dealer calling the street, rather than the player noticing a new card.
  useEffect(() => {
    if (!publicState.handInProgress) return
    const name = STREET_NAMES[publicState.street]
    if (!name) return
    announce({
      key: `street-${publicState.handNumber}-${publicState.street}`,
      text: name,
      detail: `Pot ${publicState.pot.toLocaleString()}`,
      tone: 'neutral',
    })
  }, [publicState.street, publicState.handNumber])

  // Somebody shoving is the loudest thing that happens in a hand.
  const announcedAllInRef = useRef('')
  useEffect(() => {
    if (!publicState.handInProgress) return
    const shoved = publicState.players.filter((p) => p.allIn && !p.folded)
    if (shoved.length === 0) return
    const signature = `${publicState.handNumber}:${shoved.map((p) => p.id).join(',')}`
    if (announcedAllInRef.current === signature) return
    announcedAllInRef.current = signature
    const newest = shoved[shoved.length - 1]
    announce({
      key: `allin-${signature}`,
      text: newest.id === 'you' ? 'You are all in' : `${newest.name} is all in`,
      detail: `${publicState.pot.toLocaleString()} in the middle`,
      tone: 'tense',
    })
  }, [tick])

  const isFinale = table.isFinale === true
  const opponentsBusted =
    !publicState.handInProgress && publicState.players.filter((p) => p.id !== 'you').every((p) => p.stack <= 0)

  // Tally results once per completed hand. Only pots actually won count: an
  // uncalled bet coming back is not a hand won and not a pot size.
  //
  // This runs in an effect rather than in the render body, where it used to set
  // state (speech, and now the announcement) part-way through rendering the very
  // component that reads it.
  useEffect(() => {
    if (!lastResult || publicState.handInProgress) return
    if (lastResult.handNumber === countedHandRef.current) return
    countedHandRef.current = lastResult.handNumber

    const wonAnything = lastResult.pots.some((pot) => !pot.uncalled && pot.winnerIds.includes('you'))
    for (const pot of lastResult.pots) {
      if (!pot.uncalled && pot.winnerIds.includes('you')) {
        handsWonRef.current += 1
        biggestPotRef.current = Math.max(biggestPotRef.current, pot.amount)
      }
    }
    playSound(wonAnything ? 'win' : 'lose')

    announce(resultAnnouncement(lastResult, publicState.handNumber, players))

    // Whoever the hand turned on gets the line, so a showdown lands as a moment
    // between two people rather than a number changing.
    const potWinners = lastResult.pots.filter((pot) => !pot.uncalled).flatMap((pot) => pot.winnerIds)
    const opponentWinner = potWinners.find((id) => id !== 'you')
    if (opponentWinner) say(opponentWinner, 'win', true)
    else if (wonAnything) {
      const beaten = seats.find((o) => lastResult.revealed.some((r) => r.playerId === o.id))
      if (beaten) say(beaten.id, 'lose', true)
    }
  }, [lastResult?.handNumber, publicState.handInProgress])

  /**
   * Opponents re-buy and top up between hands, the way players at a real cash
   * table do.
   *
   * Only re-seating the busted ones let the table drift into nonsense: one seat
   * grinding on 10 big blinds while another sat behind 700, which turns every pot
   * into an all-in by the turn and stops the stakes meaning anything. A cash game
   * is a roughly 100-big-blind ecosystem, and it stays one because people reload.
   */
  const rebuyOpponents = () => {
    if (isFinale) return
    for (const opponent of seats) {
      const seat = Math.round(table.buyIn * (opponent.stackMultiplier ?? 1))
      const current = engine.getState().players.find((p) => p.id === opponent.id)
      if (!current) continue
      // `rebuy` takes the stack to end up with, so the same call covers sitting a
      // busted player back down and reloading a short one.
      if (current.stack <= 0 || current.stack < seat * TOP_UP_BELOW_FRACTION) {
        engine.rebuy(opponent.id, seat)
      }
    }
  }

  const dealNextHand = () => {
    rebuyOpponents()
    engine.startNewHand()
    setLog([])
    playSound('deal')
    rerender()
  }

  // --- Carrying on between hands -------------------------------------------
  // The table used to stop dead after every hand and wait to be told to deal
  // again. A dealer does not wait to be asked, so the next hand comes on its own
  // once the last one has had time to be read — and "Hold" is there for the hand
  // worth sitting with.
  const [holding, setHolding] = useState(false)
  const handOver = !publicState.handInProgress && lastResult !== null
  const canPlayOn = handOver && !youBusted && !(isFinale && opponentsBusted)

  useEffect(() => {
    if (!canPlayOn || holding) return
    const timer = window.setTimeout(dealNextHand, AUTO_DEAL_MS)
    return () => window.clearTimeout(timer)
  }, [canPlayOn, holding, lastResult?.handNumber])

  // Space deals the next hand now, for a player who has already read the board.
  useEffect(() => {
    if (!canPlayOn) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      dealNextHand()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canPlayOn, lastResult?.handNumber])

  /**
   * Whether the hand that just ended has been on screen long enough to read.
   * Busting is announced through this gate so that going all in and losing shows
   * the showdown first — being told "you are out of chips" the instant the last
   * card lands, while the hand is still being taken in, read as the game cutting
   * the player off mid-hand.
   */
  const [resultSettled, setResultSettled] = useState(false)
  useEffect(() => {
    if (!handOver) {
      setResultSettled(false)
      return
    }
    const timer = window.setTimeout(() => setResultSettled(true), ANNOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [handOver, lastResult?.handNumber])

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
        const facingABet = ctx.toCall > 0
        if (action.type === 'raise') say(actingPlayer.id, facingABet ? 'raise' : 'bet')
        else if (action.type === 'call') say(actingPlayer.id, 'call')
        else if (action.type === 'check') say(actingPlayer.id, 'check')
        else if (action.type === 'fold') say(actingPlayer.id, 'fold')
        note(describeAction(actingPlayer.name, action, ctx))
        engine.submitAction(actingPlayer.id, action)
      }
      aiBusyRef.current = false
      rerender()
    }, 500)
    return () => clearTimeout(timer)
    // `tick` drives this rather than the shallow game fields, which can repeat
    // across genuinely different states and silently stall the AI's turn.
  }, [tick])

  // Re-anchor the slider to a pot-sized raise whenever the price changes, so it
  // always starts somewhere reasonable rather than at the last hand's number.
  useEffect(() => {
    const potAfterCall = publicState.pot + Math.max(0, publicState.currentBet - (you?.streetContribution ?? 0))
    setSliderTo(Math.min(allInTo, Math.max(publicState.minRaiseTo, publicState.currentBet + potAfterCall)))
  }, [publicState.minRaiseTo, publicState.handNumber, publicState.street])

  const yourHole = engine.getHoleCards('you')
  const legalActions = engine.getLegalActions('you')
  const canAct = publicState.actingPlayerId === 'you'
  const toCall = publicState.currentBet - you.streetContribution
  // Declared here, with `toCall`, because the hand-read memo below reads it. It
  // used to be declared ~60 lines further down, past that memo: owning the
  // hand-reading lesson therefore threw "Cannot access 'allInTo' before
  // initialization" the moment a table mounted, unmounting the app to a blank
  // screen and locking the player out of poker permanently.
  const allInTo = you.streetContribution + you.stack

  const insights = {
    showPositions: state.lessonIds.includes('position'),
    sharpEyes: state.lessonIds.includes('tells'),
    tellClarity: tellClarity(state),
  }

  // Equity is a Monte Carlo run, so only compute it when the read is actually
  // on screen and the inputs have changed.
  const opponentsInHand = publicState.players.filter((p) => p.id !== 'you' && !p.folded).length
  const handRead = useMemo(() => {
    if (!state.lessonIds.includes('hand-reading')) return null
    if (!publicState.handInProgress || yourHole.length < 2) return null
    // Against the range implied by the bet in front of you, not against random
    // cards. The lesson that unlocks this panel says "ask what they'd play this
    // way — that's a range, not a hand", and the panel used to do exactly the
    // thing the lesson warns about: with A-5 on T-6-3 facing a raise it read 51%,
    // which is the number that talks a player into calling off.
    const equity = estimateEquity(
      yourHole,
      publicState.board,
      Math.max(1, opponentsInHand),
      defaultRng,
      200,
      {
        opponentRangePercentile: inferredRangePercentile(
          {
            hole: yourHole,
            board: publicState.board,
            potSize: publicState.pot,
            toCall,
            currentBet: publicState.currentBet,
            minRaiseTo: publicState.minRaiseTo,
            allInTo,
            opponentsInHand: Math.max(1, opponentsInHand),
            skillTier: 'competent',
            street: publicState.street,
          },
          false,
        ),
      },
    )
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

  // Only ever shown for a live decision with a real pot behind it. Between
  // hands the contributions are cleared but currentBet is not, which left a
  // stale `toCall` next to a pot of 0 and printed "Calling 3557 into 0 — you
  // need 100% to break even": a division by an empty pot, and advice about a
  // decision the player no longer has.
  const potOdds =
    state.lessonIds.includes('pot-odds') &&
    publicState.handInProgress &&
    canAct &&
    toCall > 0 &&
    publicState.pot > 0
      ? { toCall, breakEven: toCall / (publicState.pot + toCall) }
      : null

  const act = (type: 'fold' | 'check' | 'call') => {
    playSound(type === 'call' ? 'chip' : type)
    note(describeAction('You', { type }, { toCall, allInTo }))
    engine.submitAction('you', { type })
    rerender()
  }
  const raiseTo = (to: number) => {
    playSound('chip')
    note(describeAction('You', { type: 'raise', to }, { toCall, allInTo }))
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
  // the showdown that just ended their session. These render in the betting
  // menu under the table instead, so the board and every revealed hand stay on
  // screen.
  const canRebuy = state.cash >= table.buyIn
  const rebuyWarning = tableAccess(state, table).bankrollWarning
  // Nothing is offered until the hand that caused it has been seen.
  const ending: 'finale-won' | 'finale-lost' | 'busted' | null = !resultSettled
    ? null
    : isFinale && opponentsBusted
      ? 'finale-won'
      : isFinale && youBusted
        ? 'finale-lost'
        : youBusted
          ? 'busted'
          : null

  const theme = themeFor(table)
  const lessons = state.lessonIds
  const needs = useMemo<SceneNeeds>(() => {
    const sample = (table.buyIn * 4).toLocaleString()
    return {
      kind: 'cash',
      opponents: seats.length,
      sampleAmount: sample,
      // The most the menu ever has to say over its buttons, so it never grows.
      infoTexts: [
        ...(lessons.includes('hand-reading') ? ['Three of a kind · ~100% to win'] : []),
        ...(lessons.includes('pot-odds') ? [`Calling ${sample} into ${sample} — you need 50% to break even`] : []),
      ],
      title: `${table.name} · $${table.smallBlind}/$${table.bigBlind}`,
      subtitle: `Wallet: $${state.cash.toLocaleString()}`,
    }
  }, [table, seats.length, lessons, state.cash])

  const actingName = players.find((p) => p.id === publicState.actingPlayerId)?.name

  const dock = (layout: SceneLayout) => {
    const P = layout.scale
    const one = buttonHeight(1, P, layout.coarse)
    const two = buttonHeight(2, P, layout.coarse)
    const plan = layout.dockPlan
    const row = { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', alignItems: 'center', gap: DOCK.gap * P }

    let body: ReactNode
    if (ending) {
      body = (
        <EndPanel P={P} theme={theme} ending={ending}>
          {ending === 'finale-won' && (
            <>
              <PxLine scale={P} wrap align="center" text="Nadia pushes her chair back, looks at you for a long moment, and offers her hand." />
              <PxButton lines={['Take the room']} scale={P} role="raise" height={one} onClick={() => leaveWith(you.stack, true)} />
            </>
          )}
          {ending === 'finale-lost' && (
            <>
              <PxLine scale={P} wrap align="center" text="Nadia stacks your last chips without ceremony. The penthouse stays hers." />
              <PxLine scale={P} wrap align="center" ink={STAKE_INK} text={`The $${table.buyIn.toLocaleString()} you put up is hers. That was the bet.`} />
              <PxButton lines={['Leave the room']} scale={P} role="plain" height={one} onClick={() => leaveWith(0, false)} />
            </>
          )}
          {ending === 'busted' && (
            <>
              <PxLine scale={P} align="center" text={`Wallet: $${state.cash.toLocaleString()}`} />
              {/* Buying back in is buying in again, so the bankroll lesson applies here too. */}
              {canRebuy && rebuyWarning && (
                <PxLine scale={P} wrap align="center" ink={STAKE_INK} testId="rebuy-bankroll-warning" text={`Bankroll warning: ${rebuyWarning}`} />
              )}
              <div style={row}>
                {canRebuy && (
                  <PxButton
                    lines={[`Rebuy ($${table.buyIn.toLocaleString()})`]}
                    scale={P}
                    role="raise"
                    height={one}
                    onClick={() => {
                      engine.rebuy('you', table.buyIn)
                      rebuyOpponents()
                      engine.startNewHand()
                      onRebuy(table.buyIn)
                      rerender()
                    }}
                  />
                )}
                <PxButton lines={['Leave table']} scale={P} role="plain" height={one} onClick={() => leaveWith(0)} />
              </div>
            </>
          )}
        </EndPanel>
      )
    } else if (!publicState.handInProgress) {
      // Between hands: who won, and a bar that says the next hand is coming,
      // rather than a panel that stops play until it is dismissed. The
      // countdown fills while it waits, so the delay is visible instead of felt.
      body = (
        <>
          {handOver && lastResult && <ShowdownSummary result={lastResult} players={players} scale={P} />}
          <div data-testid="hand-over-bar" style={{ ...row, marginTop: DOCK.gap * P }}>
            {canPlayOn && !holding && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 * P }}>
                  <span data-testid="auto-deal-status">
                    <PixelText text="Next hand" scale={P} ink={INK.dark} />
                  </span>
                  <Countdown scale={P} durationMs={AUTO_DEAL_MS} runKey={lastResult?.handNumber} />
                </span>
                <PxButton lines={['Deal now (space)']} scale={P} role="primary" height={one} onClick={dealNextHand} />
                <PxButton lines={['Hold']} scale={P} role="plain" height={one} onClick={() => setHolding(true)} />
              </>
            )}
            {canPlayOn && holding && (
              <>
                <span data-testid="auto-deal-status">
                  <PixelText text="Holding" scale={P} ink={INK.dark} />
                </span>
                <PxButton
                  lines={['Next hand (space)']}
                  scale={P}
                  role="primary"
                  height={one}
                  onClick={() => {
                    setHolding(false)
                    dealNextHand()
                  }}
                />
              </>
            )}
            {!isFinale && (
              <PxButton lines={[`Leave table ($${you.stack.toLocaleString()})`]} scale={P} role="plain" height={one} onClick={() => leaveWith(you.stack)} />
            )}
          </div>
        </>
      )
    } else {
      const info = (
        <>
          {handRead && (
            <PxLine
              scale={P}
              wrap
              align="center"
              ink={INFO_INK}
              testId="hand-read"
              text={`${handRead.made} · ~${Math.round(handRead.equity * 100)}% to win`}
            />
          )}
          {potOdds && (
            <PxLine
              scale={P}
              wrap
              align="center"
              ink={INFO_INK}
              testId="pot-odds"
              text={`Calling ${potOdds.toCall} into ${publicState.pot} — you need ${Math.round(potOdds.breakEven * 100)}% to break even`}
            />
          )}
        </>
      )
      if (!canAct) {
        body = (
          <>
            <div data-testid="action-log">
              {log.map((line, i) => (
                <PxLine key={`${i}-${line}`} scale={P} text={line} ink={i === log.length - 1 ? INK.dark : LOG_INK} />
              ))}
            </div>
            <PxLine scale={P} align="center" text={actingName ? `${actingName} to act…` : 'Dealing…'} ink={INFO_INK} />
            {info}
          </>
        )
      } else {
        const raiseOpen = legalActions.some((a) => a.type === 'raise')
        const sliderValue = Math.min(Math.max(sliderTo, publicState.minRaiseTo), allInTo)
        const raiseLabel = `Raise to ${sliderValue.toLocaleString()}`
        body = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: DOCK.gap * P }}>
            {info}
            <div style={row}>
              {legalActions.some((a) => a.type === 'fold') && (
                <PxButton lines={['Fold']} scale={P} role="fold" height={one} onClick={() => act('fold')} />
              )}
              {legalActions.some((a) => a.type === 'check') && (
                <PxButton lines={['Check']} scale={P} role="primary" height={one} onClick={() => act('check')} />
              )}
              {legalActions.some((a) => a.type === 'call') && (
                <PxButton lines={[`Call ${toCall}`]} scale={P} role="primary" height={one} onClick={() => act('call')} />
              )}
              {raiseOpen && publicState.minRaiseTo < allInTo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: DOCK.gap * P,
                    flex: plan.raiseJoinsPrimary ? `1 1 ${(DOCK.sliderMinW + DOCK.gap + buttonWidth([raiseLabel])) * P}px` : '1 1 100%',
                  }}
                >
                  <input
                    data-testid="raise-slider"
                    type="range"
                    aria-label="Raise amount"
                    className="px-slider"
                    min={publicState.minRaiseTo}
                    max={allInTo}
                    value={sliderValue}
                    onChange={(e) => setSliderTo(Number(e.target.value))}
                    style={
                      {
                        flex: 1,
                        minWidth: DOCK.sliderMinW * P,
                        height: one * P,
                        '--px': `${P}px`,
                        '--thumb': `url(${chipTopUrl()})`,
                      } as CSSProperties
                    }
                  />
                  <PxButton
                    lines={[raiseLabel]}
                    scale={P}
                    role="raise"
                    height={one}
                    testId="raise-slider-go"
                    onClick={() => raiseTo(sliderValue)}
                  />
                </div>
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
                {publicState.minRaiseTo < allInTo && (
                  <PxButton
                    lines={['Min raise', `to ${publicState.minRaiseTo.toLocaleString()}`]}
                    scale={P}
                    role="raise"
                    width={plan.sizingCellW}
                    height={two}
                    testId="raise-min"
                    onClick={() => raiseTo(publicState.minRaiseTo)}
                  />
                )}
                {raisePresets.map((preset) => (
                  // The first line names the sizing, the second is the total it
                  // raises you to. Printing the total *as* the label read "Pot
                  // 300" when the pot was 150.
                  <PxButton
                    key={preset.key}
                    lines={[preset.label, `to ${preset.to.toLocaleString()}`]}
                    scale={P}
                    role="raise"
                    width={plan.sizingCellW}
                    height={two}
                    testId={`raise-${preset.key}`}
                    onClick={() => raiseTo(preset.to)}
                  />
                ))}
                <PxButton
                  lines={['All in', `to ${allInTo.toLocaleString()}`]}
                  scale={P}
                  role="allin"
                  width={plan.sizingCellW}
                  height={two}
                  testId="raise-all-in"
                  onClick={() => raiseTo(allInTo)}
                />
              </div>
            )}
          </div>
        )
      }
    }

    return (
      <Panel
        theme={theme}
        scale={P}
        testId="dock"
        style={{
          minHeight: layout.dock.h * P,
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
      theme={theme}
      needs={needs}
      felt={(layout) => (
        <PokerTableView
          state={publicState}
          lastResult={lastResult}
          yourHole={yourHole}
          insights={insights}
          personas={personas}
          speech={speech}
          announcement={announcement}
          layout={layout}
          theme={theme}
        />
      )}
      dock={dock}
    />
  )
}

/** Information over the betting buttons: odds and reads the lessons paid for. */
const INFO_INK = { color: '#2a5a9a', shadow: '#c8d8f0' }
/** Older lines of narration, faded back. */
const LOG_INK = { color: '#8a8a98', shadow: '#dcdce4' }
/** Money that is about to change hands. */
const STAKE_INK = { color: '#8a5a10', shadow: '#ecd8b0' }

/**
 * How a session ends. Deliberately in the betting menu and not a full-screen
 * overlay: the hand that ended it is still on the table above, and covering it
 * up hid the one showdown the player most needs to see.
 */
function EndPanel({
  P,
  theme,
  ending,
  children,
}: {
  P: number
  theme: TableTheme
  ending: 'finale-won' | 'finale-lost' | 'busted'
  children: ReactNode
}) {
  const title =
    ending === 'finale-won'
      ? 'You take the last pot.'
      : ending === 'finale-lost'
        ? 'She has them all.'
        : 'That was your last chip at this table.'
  return (
    <div
      data-testid={ending}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * P, textAlign: 'center' }}
    >
      <h2 style={{ margin: 0, lineHeight: 0 }}>
        <PixelText text={title} scale={P} ink={{ color: theme.ui.outline, shadow: theme.ui.band }} />
      </h2>
      {children}
    </div>
  )
}
