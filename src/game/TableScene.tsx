import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TexasHoldEmTable, type HandResult } from '../engine/table'
import { decideAiAction, estimateEquity, inferredRangePercentile } from '../engine/ai'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { defaultRng } from '../engine/rng'
import type { PlayerConfig } from '../engine/types'
import type { OpponentDef, TableDef } from '../world/types'
import { PokerTableView, handTakings, potWinnerIds, type SeatSpeech } from './PokerTableView'
import type { Announcement } from './HandAnnouncer'
import { personalityFor, seatsOf } from '../world/characters'
import type { GameState } from './state'
import { tableAccess, tellClarity } from './progression'
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
    // Nothing is offered until the hand that caused it has been seen.
    if (!resultSettled) return null
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
        <EndPanel testId="busted" title="That was your last chip at this table.">
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
    <div style={{
        width: '100%',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, #16283a 0%, #0d1420 70%)',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        // Vertical padding tracks the window's height, not its width: on a short
        // laptop window the fixed padding was part of what pushed the betting
        // buttons off the bottom of the screen.
        padding: 'clamp(6px, 1.6vh, 20px) clamp(10px, 3vw, 20px)',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 'clamp(4px, 1.2vh, 10px)',
      }}>
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
        personas={personas}
        speech={speech}
        announcement={announcement}
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

      {/* Between hands: a thin bar that says the next hand is coming, rather than
          a panel that stops play until it is dismissed. The countdown line fills
          while it waits, so the delay is visible instead of just felt. */}
      {!publicState.handInProgress && outcome === null && (
        <div
          data-testid="hand-over-bar"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
            borderRadius: 8,
            background: 'rgba(10,16,24,0.92)',
            border: '1px solid #223047',
            fontSize: 12,
            color: '#9aa4b8',
          }}
        >
          {canPlayOn && !holding && (
            <>
              <span data-testid="auto-deal-status">Next hand</span>
              <span
                style={{
                  position: 'relative',
                  width: 90,
                  height: 3,
                  borderRadius: 2,
                  background: '#223047',
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
          {canPlayOn && holding && (
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
          )}
          {!isFinale && (
            <button style={smallButtonStyle} onClick={() => leaveWith(you.stack)}>
              Leave table (${you.stack.toLocaleString()})
            </button>
          )}
        </div>
      )}

      {publicState.handInProgress && canAct && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {legalActions.some((a) => a.type === 'fold') && (
            <button style={foldButtonStyle} onClick={() => act('fold')}>Fold</button>
          )}
          {legalActions.some((a) => a.type === 'check') && (
            <button style={primaryButtonStyle} onClick={() => act('check')}>Check</button>
          )}
          {legalActions.some((a) => a.type === 'call') && (
            <button style={primaryButtonStyle} onClick={() => act('call')}>Call {toCall}</button>
          )}
          {legalActions.some((a) => a.type === 'raise') && publicState.minRaiseTo < allInTo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                maxWidth: 420,
                justifyContent: 'center',
              }}
            >
              <input
                data-testid="raise-slider"
                type="range"
                aria-label="Raise amount"
                min={publicState.minRaiseTo}
                max={allInTo}
                value={Math.min(Math.max(sliderTo, publicState.minRaiseTo), allInTo)}
                onChange={(e) => setSliderTo(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <button
                style={buttonStyle}
                data-testid="raise-slider-go"
                onClick={() => raiseTo(Math.min(Math.max(sliderTo, publicState.minRaiseTo), allInTo))}
              >
                Raise to {Math.min(Math.max(sliderTo, publicState.minRaiseTo), allInTo).toLocaleString()}
              </button>
            </div>
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
              <button style={allInButtonStyle} data-testid="raise-all-in" onClick={() => raiseTo(allInTo)}>
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

/**
 * Folding is not the same kind of act as calling, and all-in is not the same kind
 * of act as either. They used to be ten buttons of identical green stacked on a
 * phone, with Fold carrying exactly the visual weight of All in — which is how
 * people shove their stack in by accident.
 */
const foldButtonStyle = {
  ...buttonStyle,
  background: 'transparent',
  border: '1px solid #4a5160',
  color: '#b8c0cc',
} as const

/** Check and Call: the ordinary thing to do, and the one to make easiest to hit. */
const primaryButtonStyle = {
  ...buttonStyle,
  background: '#2f6ea8',
} as const

/** Committing everything is red, and says so. */
const allInButtonStyle = {
  ...buttonStyle,
  background: '#a33636',
  border: '1px solid #c95c5c',
} as const

/** For the between-hands bar, which should read as a status line, not a prompt. */
const smallButtonStyle = {
  ...buttonStyle,
  background: 'transparent',
  border: '1px solid #35507a',
  color: '#bcc8da',
  padding: '4px 10px',
  fontSize: 12,
} as const

/** Tighter, since up to seven sizing buttons have to wrap sanely at 390px. */
const sizingButtonStyle = {
  ...buttonStyle,
  background: '#2f7d4a',
  padding: 'clamp(6px, 2vw, 8px) clamp(8px, 3vw, 14px)',
  fontSize: 'clamp(12px, 3.4vw, 14px)',
} as const
