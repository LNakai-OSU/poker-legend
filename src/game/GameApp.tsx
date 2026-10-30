import { useEffect, useRef, useState } from 'react'
import { CityScene } from '../overworld/CityScene'
import { PokerNightScene } from './PokerNightScene'
import { BusTransition } from './BusTransition'
import { rideRoad } from './busRide'
import { TableScene, type SessionResult } from './TableScene'
import { buttonStyle as menuButtonStyle, MentorScene, MenuScreen, ShopScene, SponsorScene, TravelScene } from './MenuScenes'
import { CaughtScene, EndingScene, FinaleLostScene } from './EndScenes'
import { CrapsScene, SlotsScene } from './CasinoGameScenes'
import { PenthouseScene, VenueScene } from './VenueScenes'
import { SideNav } from './SideNav'
import { anyKeyLayer } from './keys'
import { CITIES, LESSONS, MISSIONS, SPONSORS, TABLES, findArea } from '../world/content'
import { hasFastTravel, missionStatus, tableAccess, travelCostTo } from './progression'
import { CASINO_GOALS } from '../world/goals'
import { clearSave, loadGame, saveGame } from './save'
import { useEventRunner } from './useEventRunner'
import { BadBeatIntro } from './BadBeatIntro'
import { ReelScene } from './ReelScene'
import { DialogueBox } from './DialogueBox'
import { ChoiceBox } from './ChoiceBox'
import { CHARACTERS } from '../world/characters'
import { EVENTS, eventFor } from '../world/events'
import { SoundToggle, useAudioUnlock } from '../audio/SoundToggle'
import { playSound } from '../audio/audio'
import {
  BUST_LINE,
  advanceDay,
  advancePeriod,
  arriveAt,
  caughtByCollectors,
  huntingSponsorId,
  recordBust,
  initialState,
  lostFinalChallenge,
  payDebt,
  recordBossBeaten,
  recordCasinoSession,
  takeStake,
  travelTo,
  unlockTable,
  type CityId,
  type GameState,
} from './state'
import type { PoiAction } from '../world/types'

/** A speaker id becomes the name that character is known by; anything else stands. */
function speakerName(speaker: string): string {
  return CHARACTERS[speaker]?.name ?? speaker
}

/** Tables you cannot simply walk up to; a club invitation opens them. */
const INVITE_ONLY_TABLES = new Set(['crescent-private', 'mesa-private'])

type View =
  | { kind: 'city' }
  | { kind: 'pokerNight' }
  | {
      kind: 'bus'
      destination: string
      caption?: string
      /** Where the bus puts you down. */
      arrive: { cityId?: CityId; areaId?: string; col?: number; row?: number }
    }
  /** A ride a beat put you on: no skip button, and off when the beat says. */
  | { kind: 'ride'; destination: string; caption?: string; with: string[]; areaId?: string }
  | { kind: 'table'; tableId: string }
  | { kind: 'blocked'; title: string; message: string }
  | { kind: 'bankrollWarning'; tableId: string; warning: string }
  | { kind: 'finaleCommit'; tableId: string }
  | { kind: 'shop'; shopId: string }
  | { kind: 'mentor' }
  | { kind: 'sponsor'; sponsorId: string }
  | { kind: 'travel' }
  | { kind: 'slots' }
  | { kind: 'craps' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'penthouse' }
  | { kind: 'caught' }
  | { kind: 'ending' }
  | { kind: 'finaleLost' }

export function GameApp() {
  const [state, setState] = useState<GameState>(() => loadGame() ?? initialState())
  const [view, setView] = useState<View>({ kind: 'city' })
  // Where to stand when walking through a door, so you appear at the doorway
  // rather than at the area's default spawn.
  const [entryTile, setEntryTile] = useState<{ col: number; row: number } | null>(null)
  /**
   * Settings is laid over the game rather than being somewhere you go.
   *
   * As a view of its own it replaced whatever was on screen, which unmounted the
   * poker table — and the table is where the hand, the chips in front of you and
   * the buy-in already taken out of your wallet all live. Opening the menu
   * mid-session therefore cost the player everything they had won and put them
   * back on the street. Over the top, nothing unmounts and closing it puts you
   * back exactly where you were.
   */
  const [menuOpen, setMenuOpen] = useState(false)
  /** Whose collectors it was, for the shakedown screen; the hunt is over by the time it shows. */
  const [caughtBy, setCaughtBy] = useState<string | null>(null)
  useAudioUnlock()

  /**
   * The runner for scripted beats. Everything it cannot do by itself — changing
   * scene, putting the player somewhere — it hands back here.
   */
  const events = useEventRunner(state, setState, {
    onStartTable: (tableId) => setView({ kind: 'table', tableId }),
    onStartPokerNight: () => setView({ kind: 'pokerNight' }),
    onPlace: (col, row) => setEntryTile({ col, row }),
    onStartRide: (ride) => setView({ kind: 'ride', ...ride }),
    onEndRide: () => setView({ kind: 'city' }),
  })

  // Hub locations are the checkpoints; table and menu state is never persisted.
  // Nor is a beat half-played: it is saved once it is over, so a reload in the
  // middle of one puts you back where it started rather than somewhere it was
  // carrying you, with nobody beside you and the beat forgotten.
  useEffect(() => {
    if (view.kind === 'city' && !events.isRunning) saveGame(state)
  }, [state, view.kind, events.isRunning])

  const backToCity = () => setView({ kind: 'city' })

  /**
   * Walking into somewhere is a moment a beat can be written for.
   *
   * Fired when the area changes — through a door, off the edge of a street, off
   * a bus — and not when a save is loaded into one or when you get up from a
   * table in the room you were already in: that is being somewhere, not
   * arriving. A beat can ask to fire then too (`onLoad`): one that has to
   * happen before anything else there — the opening, which a reload half-way
   * through must not skip, and the scene straight after the first poker night.
   */
  const lastArea = useRef<string | null>(null)
  const runEvent = events.run
  const clearCast = events.clearCast
  /** A few lines said to the player where they stand: a shut door, a highway. */
  const notice = (lines: string[]) =>
    runEvent({
      id: 'notice',
      about: 'Something said to a player who has been stopped.',
      trigger: { kind: 'interact', poiId: 'notice' },
      repeatable: true,
      actions: [{ kind: 'dialogue', lines }],
    })
  useEffect(() => {
    if (view.kind !== 'city') return
    const areaId = state.areaId ?? CITIES[state.cityId].entryAreaId
    const previous = lastArea.current
    lastArea.current = areaId
    if (previous === null) {
      const event = eventFor(EVENTS, { kind: 'enterArea', areaId }, state)
      if (event?.trigger.kind === 'enterArea' && event.trigger.onLoad) runEvent(event)
      return
    }
    if (previous === areaId) return
    // Whoever a beat left standing in the last place is not standing here.
    clearCast()
    const event = eventFor(EVENTS, { kind: 'enterArea', areaId }, state)
    if (event) runEvent(event)
  }, [view.kind, state, runEvent, clearCast])

  /**
   * Back to the room you were sitting in. Like a load, this is finding yourself
   * somewhere rather than walking in, so only an `onLoad` beat is asked — the
   * one that has to happen before anything else here.
   */
  const getUpFromTable = () => {
    lastArea.current = null
    backToCity()
  }

  const handlePoi = (action: PoiAction) => {
    switch (action.kind) {
      case 'travel':
        setView({ kind: 'travel' })
        break
      case 'shop':
        setView({ kind: 'shop', shopId: action.shopId })
        break
      case 'mentor':
        setView({ kind: 'mentor' })
        break
      case 'sponsor':
        setView({ kind: 'sponsor', sponsorId: action.sponsorId })
        break
      case 'mission':
        handleMission(action.missionId)
        break
      case 'table':
        handleSitDown(action.tableId)
        break
      case 'slots':
        setView({ kind: 'slots' })
        break
      case 'craps':
        setView({ kind: 'craps' })
        break
      case 'venue':
        setView({ kind: 'venue', venueId: action.venueId })
        break
      case 'penthouse':
        setView({ kind: 'penthouse' })
        break
      case 'flavor':
        break
    }
  }

  const handleMission = (missionId: string) => {
    const mission = MISSIONS[missionId]
    if (!mission) return
    const status = missionStatus(state, missionId)
    if (status === 'unseen') {
      setState((s) => ({ ...s, acceptedMissionIds: [...s.acceptedMissionIds, missionId] }))
    } else if (status === 'ready') {
      setState((s) => ({
        ...s,
        cash: s.cash + mission.rewardCash,
        ownedItemIds:
          mission.rewardItemId && !s.ownedItemIds.includes(mission.rewardItemId)
            ? [...s.ownedItemIds, mission.rewardItemId]
            : s.ownedItemIds,
        completedMissionIds: [...s.completedMissionIds, missionId],
        acceptedMissionIds: s.acceptedMissionIds.filter((id) => id !== missionId),
      }))
      playSound('cash')
    }
  }

  /** What this sitting has cost so far (buy-in and rebuys), to work out what it won. */
  const sessionSpend = useRef(0)

  const buyInAndSit = (table: (typeof TABLES)[string]) => {
    // The buy-in leaves your wallet and becomes chips in front of you.
    sessionSpend.current = table.freeroll ? 0 : table.buyIn
    if (!table.freeroll) setState((s) => ({ ...s, cash: s.cash - table.buyIn }))
    setView({ kind: 'table', tableId: table.id })
  }

  const handleSitDown = (tableId: string, skipBankrollCheck = false) => {
    const table = TABLES[tableId]
    if (!table) return
    if (INVITE_ONLY_TABLES.has(tableId) && !state.unlockedTableIds.includes(tableId)) {
      setView({
        kind: 'blocked',
        title: table.name,
        message: 'This game is invitation only. Make a name for yourself somewhere they can see you.',
      })
      return
    }
    const access = tableAccess(state, table)
    if (!access.allowed) {
      setView({ kind: 'blocked', title: table.name, message: access.reason ?? 'You cannot sit down here.' })
      return
    }
    // The bankroll lesson is what earns this: the player can still sit, but they
    // are told what they are risking before the buy-in leaves their wallet.
    if (access.bankrollWarning && !skipBankrollCheck) {
      setView({ kind: 'bankrollWarning', tableId, warning: access.bankrollWarning })
      return
    }
    // The finale has no Leave button on purpose, and one side loses everything
    // they put up. Both of those have to be said before the money moves.
    if ((table.isFinale && !table.freeroll) || table.bossOf) {
      setView({ kind: 'finaleCommit', tableId })
      return
    }
    buyInAndSit(table)
  }

  const handleLeaveTable = (table: (typeof TABLES)[string], result: SessionResult) => {
    // A town's boss, one on one: win and the bus to the next town will take you.
    if (table.bossOf) {
      const goal = CASINO_GOALS[table.bossOf]
      const boss = CHARACTERS[goal.bossId]
      const won = result.finaleWon === true
      const settled = advanceDay({
        ...state,
        cash: state.cash + (won ? result.chipsCashedOut : 0),
        stats: {
          handsWon: state.stats.handsWon + result.handsWon,
          biggestPot: Math.max(state.stats.biggestPot, result.biggestPot),
          tablesPlayed: state.stats.tablesPlayed + 1,
        },
      })
      const after = won ? recordBossBeaten(settled, table.bossOf) : settled.cash < BUST_LINE ? recordBust(settled) : settled
      setState(() => after)
      getUpFromTable()
      playSound(won ? 'cash' : 'lose')
      notice(won ? goal.beaten : [boss.lines?.win?.[0] ?? `${boss.name}: Better luck next time.`])
      return
    }
    // Everything else at a poker table counts toward the town's private room.
    const net = result.chipsCashedOut - sessionSpend.current
    sessionSpend.current = 0
    const goal = table.isFinale ? undefined : CASINO_GOALS[state.cityId]
    let unlocked: string[] | null = null
    if (goal && !state.casino.roomOpen.includes(goal.cityId)) {
      if ((state.casino.net[goal.cityId] ?? 0) + net >= goal.winTarget) {
        unlocked = [`That is $${goal.winTarget.toLocaleString()} won at the ${goal.casino}. A door at the back of the floor has just been unlocked for you, and somebody is waiting behind it.`]
      }
    }
    setState((s) => {
      const counted = table.isFinale ? s : recordCasinoSession(s, s.cityId, net, CASINO_GOALS[s.cityId]?.winTarget)
      const next = advanceDay({
        ...counted,
        cash: s.cash + result.chipsCashedOut,
        stats: {
          handsWon: s.stats.handsWon + result.handsWon,
          biggestPot: Math.max(s.stats.biggestPot, result.biggestPot),
          tablesPlayed: s.stats.tablesPlayed + 1,
        },
      })
      if (result.finaleWon) {
        return { ...next, flags: { ...next.flags, beatFinalRival: true, hasPenthouse: true } }
      }
      // Getting up with less than the cheapest seat costs is going broke, and
      // the people who know you will say so.
      const settled = next.cash < BUST_LINE ? recordBust(next) : next
      // Losing the match is its own outcome, not a cash-game session that
      // happened to go badly: the buy-in stays with her and so does the table.
      if (table.isFinale) return lostFinalChallenge(settled)
      return settled
    })
    if (table.isFinale) setView({ kind: result.finaleWon ? 'ending' : 'finaleLost' })
    else {
      getUpFromTable()
      if (unlocked) notice(unlocked)
    }
  }

  const handleCaught = () => {
    // They take most of what you're carrying, but the debt still stands — getting
    // caught must never be cheaper than paying. You keep what you've learned and
    // what you own, and they give you a few days before they come looking again,
    // so there is still a game to climb back out with.
    const shakedown = () => {
      setCaughtBy(huntingSponsorId(state))
      setState(caughtByCollectors)
      playSound('lose')
      setView({ kind: 'caught' })
    }
    // Whoever caught you says their piece first, standing over you in the street,
    // and the shakedown follows the last line.
    const event = eventFor(EVENTS, { kind: 'caught' }, state)
    if (!event || !events.run(event, shakedown)) shakedown()
  }

  /** Gambling a bankroll away below the cheapest seat is a bust, like a session. */
  const settleGamble = (delta: number) =>
    setState((s) => {
      const cash = Math.max(0, s.cash + delta)
      const next = { ...s, cash }
      return s.cash >= BUST_LINE && cash < BUST_LINE ? recordBust(next) : next
    })

  const scene = (() => {
    switch (view.kind) {
    case 'pokerNight':
      return (
        <PokerNightScene
          onWin={(winnings) => {
            // Winnings are *added* to the roll. This used to assign it, so
            // walking in with $250,000 and winning set the bankroll to ~$1,500.
            // You are still sitting in Marcus's front room. The win itself takes
            // you nowhere: the beat that follows it does (`dana-walks-you-home`),
            // as content, and it is asked because getting up is not walking in.
            setState((s) => ({ ...s, cash: s.cash + winnings, flags: { ...s.flags, wonPokerNight: true } }))
            getUpFromTable()
          }}
          onLeave={getUpFromTable}
        />
      )

    case 'bus': {
      const ride = view
      return (
        <BusTransition
          destination={ride.destination}
          caption={ride.caption}
          road={rideRoad(ride.arrive)}
          period={state.period}
          onArrive={() => {
            setState((s) =>
              ride.arrive.cityId
                ? travelTo(s, ride.arrive.cityId, {
                    keepDay: hasFastTravel(s),
                    areaId:
                      CITIES[ride.arrive.cityId].arrivalAreaId ??
                      CITIES[ride.arrive.cityId].entryAreaId,
                  })
                : // A ride across town costs no day — that is what makes the bus
                  // worth taking — but it is still an hour of your afternoon, and
                  // the hour is how you find somebody who is not where they were.
                  advancePeriod({ ...s, areaId: ride.arrive.areaId ?? s.areaId }),
            )
            // A tile from the area you just left means nothing in the one you are
            // arriving at — and in a room smaller than the map you came from it is
            // off the grid entirely, which is why it left the player stuck.
            setEntryTile(
              ride.arrive.areaId && ride.arrive.col !== undefined && ride.arrive.row !== undefined
                ? { col: ride.arrive.col, row: ride.arrive.row }
                : null,
            )
            backToCity()
          }}
        />
      )
    }

    case 'ride':
      return (
        <BusTransition
          destination={view.destination}
          caption={view.caption}
          companions={view.with}
          road={rideRoad({ areaId: view.areaId })}
          period={state.period}
          forced
        />
      )

    case 'table': {
      const table = TABLES[view.tableId]
      return (
        <TableScene
          key={view.tableId}
          table={table}
          state={state}
          onRebuy={(amount) => {
            sessionSpend.current += amount
            setState((s) => ({ ...s, cash: s.cash - amount }))
          }}
          onLeave={(result) => handleLeaveTable(table, result)}
        />
      )
    }

    case 'blocked':
      return (
        <MenuScreen title={view.title} onBack={backToCity} backLabel="Step away">
          <p>{view.message}</p>
        </MenuScreen>
      )

    case 'bankrollWarning': {
      const table = TABLES[view.tableId]
      return (
        <MenuScreen title={table.name} onBack={backToCity} backLabel="Walk away">
          <p data-testid="bankroll-warning" style={{ color: '#f2c14e' }}>
            Bankroll warning: {view.warning}
          </p>
          <p>
            Buy-in ${table.buyIn.toLocaleString()} &middot; your roll ${state.cash.toLocaleString()}. One bad session
            here takes a real bite out of what you have left to play with.
          </p>
          <button
            data-testid="sit-anyway"
            style={menuButtonStyle}
            onClick={() => handleSitDown(view.tableId, true)}
          >
            Sit down anyway
          </button>
        </MenuScreen>
      )
    }

    case 'finaleCommit': {
      const table = TABLES[view.tableId]
      const rival = table.bossOf ? CHARACTERS[CASINO_GOALS[table.bossOf].bossId].name : 'her'
      return (
        <MenuScreen title={table.name} onBack={backToCity} backLabel="Not tonight">
          <p data-testid="finale-commitment" style={{ color: '#f2c14e' }}>
            One match, ${table.buyIn.toLocaleString()} each, winner takes every chip on the table.
          </p>
          <p>
            You are locked in for the whole match. There is no cashing out and no standing up
            &mdash; it is over when one of you has all the chips.
          </p>
          <p>
            {table.bossOf
              ? `If that is ${rival}, the $${table.buyIn.toLocaleString()} is theirs, and you do not get to the next town until you have beaten them.`
              : `If that is her, the $${table.buyIn.toLocaleString()} is hers, and she will not put the match up again for another week.`}
          </p>
          <p style={{ color: '#9a9ab0' }}>
            Your roll ${state.cash.toLocaleString()} &rarr; ${(state.cash - table.buyIn).toLocaleString()} once
            the money is up.
          </p>
          <button
            data-testid="finale-accept"
            style={menuButtonStyle}
            onClick={() => buyInAndSit(table)}
          >
            Put up the ${table.buyIn.toLocaleString()}
          </button>
        </MenuScreen>
      )
    }

    case 'shop':
      return (
        <ShopScene
          shopId={view.shopId}
          state={state}
          onBuy={(item) => {
            if (state.cash < item.price || state.ownedItemIds.includes(item.id)) return
            setState((s) => ({
              ...s,
              cash: s.cash - item.price,
              ownedItemIds: [...s.ownedItemIds, item.id],
            }))
            playSound('cash')
          }}
          onBack={backToCity}
        />
      )

    case 'mentor':
      return (
        <MentorScene
          state={state}
          onLearn={(lessonId) => {
            const lesson = LESSONS[lessonId]
            if (!lesson || state.cash < lesson.price || state.lessonIds.includes(lessonId)) return
            setState((s) => ({
              ...s,
              cash: s.cash - lesson.price,
              lessonIds: [...s.lessonIds, lessonId],
            }))
            playSound('cash')
          }}
          onBack={backToCity}
        />
      )

    case 'sponsor': {
      const sponsor = SPONSORS[view.sponsorId]
      return (
        <SponsorScene
          sponsorId={view.sponsorId}
          state={state}
          onTakeStake={() => {
            setState((s) => takeStake(s, sponsor, sponsor.principal, sponsor.interestRate, sponsor.dueInDays))
            backToCity()
          }}
          onRepay={(debtId) => setState((s) => payDebt(s, debtId))}
          onBack={backToCity}
        />
      )
    }

    case 'travel':
      return (
        <TravelScene
          state={state}
          onTravel={(cityId: CityId) => {
            const fare = travelCostTo(state, cityId)
            setState((s) => ({ ...s, cash: s.cash - fare }))
            setView({
              kind: 'bus',
              destination: CITIES[cityId]?.name ?? 'somewhere else',
              caption: 'You count what you have twice, just to be sure.',
              arrive: { cityId },
            })
          }}
          onLocalTrip={(stop) => {
            setView({
              kind: 'bus',
              destination: stop.name,
              caption: 'Four stops. You could have walked it, but you did not.',
              arrive: { areaId: stop.areaId, col: stop.col, row: stop.row },
            })
          }}
          onBack={backToCity}
        />
      )

    case 'slots':
      return (
        <SlotsScene
          state={state}
          onResult={settleGamble}
          onBack={backToCity}
        />
      )

    case 'craps':
      return (
        <CrapsScene
          state={state}
          onResult={settleGamble}
          onBack={backToCity}
        />
      )

    case 'venue':
      return (
        <VenueScene
          venueId={view.venueId}
          state={state}
          onSpend={(amount) => setState((s) => ({ ...s, cash: Math.max(0, s.cash - amount) }))}
          onUnlockTable={(tableId) => setState((s) => unlockTable(s, tableId))}
          onRest={(days) =>
            // Sitting down to eat takes the time sitting down to eat takes.
            setState((s) =>
              advancePeriod({ ...s, restedUntilDay: Math.max(s.restedUntilDay, s.day + days) }),
            )
          }
          onBack={backToCity}
        />
      )

    case 'penthouse':
      return <PenthouseScene state={state} onBack={backToCity} />

    case 'caught':
      return <CaughtScene sponsorId={caughtBy} onRestart={backToCity} />

    case 'ending':
      return <EndingScene state={state} onContinue={backToCity} />

    case 'finaleLost':
      return <FinaleLostScene state={state} onContinue={backToCity} />

      default:
        return (
          <CityScene
            state={state}
            entryTile={entryTile}
            onAction={handlePoi}
            onEnterArea={(areaId, col, row) => {
              // Walking between towns is just walking, so the city follows the
              // area rather than the other way round.
              const destination = findArea(areaId)
              setState((s) => arriveAt(s, areaId, destination?.cityId ?? s.cityId))
              setEntryTile({ col, row })
            }}
            onCaught={handleCaught}
            onNotice={notice}
            onEvent={events.run}
            cast={events.stage.cast}
            cues={events.stage.cues}
            onCueDone={events.cueDone}
            // The menu is a pause: nobody walks, nobody chases, while it is open.
            paused={events.isRunning || menuOpen}
          />
        )
    }
  })()

  // The finale still hides the button. Settings no longer unmounts the table, so
  // it is not an escape hatch any more, but the match is meant to feel like a
  // door that has shut behind you and a menu button undercuts that.
  const lockedInAtTable =
    view.kind === 'table' && (TABLES[view.tableId]?.isFinale === true || TABLES[view.tableId]?.bossOf !== undefined)

  // Escape opens the menu when nothing else has the keys — no text box, no
  // question, no menu of its own (where Escape is the way out instead).
  useEffect(() => {
    if (menuOpen || lockedInAtTable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || anyKeyLayer()) return
      e.preventDefault()
      setMenuOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, lockedInAtTable])

  return (
    <>
      <SoundToggle />
      {events.stage.faded && (
        <div
          data-testid="event-fade"
          style={{
            position: 'fixed',
            inset: 0,
            background: '#07070c',
            zIndex: 90,
            pointerEvents: 'none',
            animation: 'fade-in 420ms ease-out both',
          }}
        />
      )}
      {events.stage.dialogue && (
        <div data-testid="event-dialogue" style={{ position: 'fixed', inset: 0, zIndex: 95 }}>
          <DialogueBox
            key={events.stage.dialogue.id}
            speaker={speakerName(events.stage.dialogue.speaker)}
            lines={events.stage.dialogue.lines}
            onFinish={events.advance}
          />
        </div>
      )}
      {events.stage.cinematic && <BadBeatIntro key={events.stage.cinematic.id} onDone={events.cinematicDone} />}
      {events.stage.reel && (
        <ReelScene
          key={events.stage.reel.id}
          title={events.stage.reel.title}
          panels={events.stage.reel.panels}
          onDone={events.reelDone}
        />
      )}
      {events.stage.choice && (
        <ChoiceBox
          key={events.stage.choice.id}
          speaker={speakerName(events.stage.choice.speaker)}
          prompt={events.stage.choice.prompt}
          options={events.stage.choice.options}
          onChoose={events.choose}
        />
      )}
      {!lockedInAtTable && (
        <button
          data-testid="settings-button"
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top))',
            right: 60,
            zIndex: 50,
            width: 40,
            minHeight: 40,
            borderRadius: 8,
            border: '1px solid #4a4a66',
            background: 'rgba(10,10,16,0.8)',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
      )}
      <div key={view.kind} className="scene-fade">
        {scene}
      </div>

      {/* Over the game, not instead of it: the scene underneath stays mounted, so
          closing this puts the player back in the same hand with the same chips. */}
      {menuOpen && (
        <SideNav
          state={state}
          onNewGame={() => {
            clearSave()
            setState(initialState())
            setMenuOpen(false)
            setView({ kind: 'city' })
          }}
          onClose={() => {
            setMenuOpen(false)
            // The keys go back to the game, not to a button: the ☰ holding the
            // focus would open the menu again on the next Enter.
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
          }}
        />
      )}
    </>
  )
}
