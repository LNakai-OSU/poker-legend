import { useEffect, useState } from 'react'
import { CityScene } from '../overworld/CityScene'
import { PokerNightScene } from './PokerNightScene'
import { BusTransition } from './BusTransition'
import { TableScene, type SessionResult } from './TableScene'
import { MentorScene, MenuScreen, ShopScene, SponsorScene, TravelScene } from './MenuScenes'
import { CaughtScene, EndingScene } from './EndScenes'
import { CrapsScene, SlotsScene } from './CasinoGameScenes'
import { PenthouseScene, VenueScene } from './VenueScenes'
import { SettingsScene } from './SettingsScene'
import { LESSONS, MISSIONS, SPONSORS, TABLES } from '../world/content'
import { missionStatus, tableAccess, travelCostTo } from './progression'
import { clearSave, loadGame, saveGame } from './save'
import { SoundToggle, useAudioUnlock } from '../audio/SoundToggle'
import { playSound } from '../audio/audio'
import {
  advanceDay,
  initialState,
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
  | { kind: 'bus' }
  | { kind: 'table'; tableId: string }
  | { kind: 'blocked'; title: string; message: string }
  | { kind: 'shop'; shopId: string }
  | { kind: 'mentor' }
  | { kind: 'sponsor'; sponsorId: string }
  | { kind: 'travel' }
  | { kind: 'slots' }
  | { kind: 'craps' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'penthouse' }
  | { kind: 'settings' }
  | { kind: 'caught' }
  | { kind: 'ending' }

export function GameApp() {
  const [state, setState] = useState<GameState>(() => loadGame() ?? initialState())
  const [view, setView] = useState<View>({ kind: 'city' })
  useAudioUnlock()

  // Hub locations are the checkpoints; table and menu state is never persisted.
  useEffect(() => {
    if (view.kind === 'city') saveGame(state)
  }, [state, view.kind])

  const backToCity = () => setView({ kind: 'city' })

  const handlePoi = (action: PoiAction) => {
    switch (action.kind) {
      case 'pokerNight':
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

  const handleSitDown = (tableId: string) => {
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
    // The buy-in leaves your wallet and becomes chips in front of you.
    setState((s) => ({ ...s, cash: s.cash - table.buyIn }))
    setView({ kind: 'table', tableId })
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
      return next
    })
    if (table.isFinale && result.finaleWon) setView({ kind: 'ending' })
    else backToCity()
  }

  const handleCaught = () => {
    // They take everything you're carrying and the slate is wiped; you keep
    // what you've learned and what you own, and start rebuilding.
    setState((s) => ({ ...s, cash: 0, debts: [], huntedInCityId: null }))
    playSound('lose')
    setView({ kind: 'caught' })
  }

  const scene = (() => {
    switch (view.kind) {
    case 'pokerNight':
      return (
        <PokerNightScene
          onWin={(winnings) => {
            setState((s) => ({ ...s, cash: winnings, flags: { ...s.flags, wonPokerNight: true } }))
            setView({ kind: 'bus' })
          }}
        />
      )

    case 'bus':
      return (
        <BusTransition
          onArrive={() => {
            setState((s) => travelTo(s, 'silverCreek'))
            backToCity()
          }}
        />
      )

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
            setState((s) => travelTo({ ...s, cash: s.cash - travelCostTo(s, cityId) }, cityId))
            backToCity()
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
          onBack={backToCity}
        />
      )

    case 'penthouse':
      return <PenthouseScene state={state} onBack={backToCity} />

    case 'settings':
      return (
        <SettingsScene
          state={state}
          onNewGame={() => {
            clearSave()
            setState(initialState())
            setView({ kind: 'city' })
          }}
          onBack={backToCity}
        />
      )

    case 'caught':
      return <CaughtScene onRestart={backToCity} />

    case 'ending':
      return <EndingScene state={state} onContinue={backToCity} />

      default:
        return <CityScene state={state} onAction={handlePoi} onCaught={handleCaught} />
    }
  })()

  return (
    <>
      <SoundToggle />
      {view.kind !== 'settings' && (
        <button
          data-testid="settings-button"
          aria-label="Settings"
          onClick={() => setView({ kind: 'settings' })}
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
    </>
  )
}
