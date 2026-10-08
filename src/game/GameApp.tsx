import { useEffect, useState } from 'react'
import { CityScene } from '../overworld/CityScene'
import { PokerNightScene } from './PokerNightScene'
import { BusTransition } from './BusTransition'
import { TableScene, type SessionResult } from './TableScene'
import { buttonStyle as menuButtonStyle, MentorScene, MenuScreen, ShopScene, SponsorScene, TravelScene } from './MenuScenes'
import { CaughtScene, EndingScene, FinaleLostScene } from './EndScenes'
import { CrapsScene, SlotsScene } from './CasinoGameScenes'
import { PenthouseScene, VenueScene } from './VenueScenes'
import { SettingsScene } from './SettingsScene'
import { CITIES, LESSONS, MISSIONS, SPONSORS, TABLES, findArea } from '../world/content'
import { hasFastTravel, missionStatus, tableAccess, travelCostTo } from './progression'
import { clearSave, loadGame, saveGame } from './save'
import { SoundToggle, useAudioUnlock } from '../audio/SoundToggle'
import { playSound } from '../audio/audio'
import {
  advanceDay,
  advancePeriod,
  caughtByCollectors,
  daysUntilRematch,
  initialState,
  lostFinalChallenge,
  payDebt,
  takeStake,
  travelTo,
  unlockTable,
  type CityId,
  type GameState,
} from './state'
import type { PoiAction } from '../world/types'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  useAudioUnlock()

  // Hub locations are the checkpoints; table and menu state is never persisted.
  useEffect(() => {
    if (view.kind === 'city') saveGame(state)
  }, [state, view.kind])

  const backToCity = () => setView({ kind: 'city' })

  const handlePoi = (action: PoiAction) => {
    switch (action.kind) {
      case 'pokerNight':
        // One-time story beat: the game that starts the campaign, not a table
        // you can farm. Marcus stops dealing you in once you've taken his night.
        if (state.flags.wonPokerNight) break
        setView({ kind: 'pokerNight' })
        break
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

  const buyInAndSit = (table: (typeof TABLES)[string]) => {
    // The buy-in leaves your wallet and becomes chips in front of you.
    setState((s) => ({ ...s, cash: s.cash - table.buyIn }))
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
    // Losing the heads-up match means she will not rack it up again for a while;
    // without this the climax is a button you can keep pressing until it pays.
    if (table.isFinale && daysUntilRematch(state) > 0) {
      setView({
        kind: 'blocked',
        title: table.name,
        message:
          `Nadia took your ${table.buyIn.toLocaleString()} and is not putting the match up again tonight. ` +
          `Come back in ${daysUntilRematch(state)} day${daysUntilRematch(state) === 1 ? '' : 's'}.`,
      })
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
    if (table.isFinale) {
      setView({ kind: 'finaleCommit', tableId })
      return
    }
    buyInAndSit(table)
  }

  const handleLeaveTable = (table: (typeof TABLES)[string], result: SessionResult) => {
    setState((s) => {
      const next = advanceDay({
        ...s,
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
      // Losing the match is its own outcome, not a cash-game session that
      // happened to go badly: the buy-in stays with her and so does the table.
      if (table.isFinale) return lostFinalChallenge(next)
      return next
    })
    if (table.isFinale) setView({ kind: result.finaleWon ? 'ending' : 'finaleLost' })
    else backToCity()
  }

  const handleCaught = () => {
    // They take most of what you're carrying, but the debt still stands — getting
    // caught must never be cheaper than paying. You keep what you've learned and
    // what you own, and they give you a few days before they come looking again,
    // so there is still a game to climb back out with.
    setState(caughtByCollectors)
    playSound('lose')
    setView({ kind: 'caught' })
  }

  const scene = (() => {
    switch (view.kind) {
    case 'pokerNight':
      return (
        <PokerNightScene
          onWin={(winnings) => {
            // Winnings are *added* to the roll. This used to assign it, so
            // walking in with $250,000 and winning set the bankroll to ~$1,500.
            // You are still sitting in Marcus's front room. Getting out of town is
            // a decision for the morning, not something the win does for you.
            setState((s) => ({ ...s, cash: s.cash + winnings, flags: { ...s.flags, wonPokerNight: true } }))
            backToCity()
          }}
          onLeave={backToCity}
        />
      )

    case 'bus': {
      const ride = view
      return (
        <BusTransition
          destination={ride.destination}
          caption={ride.caption}
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

    case 'table': {
      const table = TABLES[view.tableId]
      return (
        <TableScene
          key={view.tableId}
          table={table}
          state={state}
          onRebuy={(amount) => setState((s) => ({ ...s, cash: s.cash - amount }))}
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
            If that is her, the ${table.buyIn.toLocaleString()} is hers, and she will not put the
            match up again for another week.
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
          onResult={(delta) => setState((s) => ({ ...s, cash: Math.max(0, s.cash + delta) }))}
          onBack={backToCity}
        />
      )

    case 'craps':
      return (
        <CrapsScene
          state={state}
          onResult={(delta) => setState((s) => ({ ...s, cash: Math.max(0, s.cash + delta) }))}
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
      return <CaughtScene onRestart={backToCity} />

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
              setState((s) => ({ ...s, areaId, cityId: destination?.cityId ?? s.cityId }))
              setEntryTile({ col, row })
            }}
            onCaught={handleCaught}
          />
        )
    }
  })()

  // The finale still hides the button. Settings no longer unmounts the table, so
  // it is not an escape hatch any more, but the match is meant to feel like a
  // door that has shut behind you and a menu button undercuts that.
  const lockedInAtTable = view.kind === 'table' && TABLES[view.tableId]?.isFinale === true

  return (
    <>
      <SoundToggle />
      {!settingsOpen && !lockedInAtTable && (
        <button
          data-testid="settings-button"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
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
      {settingsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto' }}>
          <SettingsScene
            state={state}
            onNewGame={() => {
              clearSave()
              setState(initialState())
              setSettingsOpen(false)
              setView({ kind: 'city' })
            }}
            onBack={() => setSettingsOpen(false)}
          />
        </div>
      )}
    </>
  )
}
