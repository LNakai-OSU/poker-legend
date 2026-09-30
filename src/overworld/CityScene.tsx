import { OverworldScene, type ChaserConfig, type Interactable, type SceneExit } from './OverworldScene'
import { CITIES, MISSIONS } from '../world/content'
import { missionStatus } from '../game/progression'
import { daysUntilDue, totalOwed, type GameState } from '../game/state'
import type { PoiAction, PoiDef } from '../world/types'
import type { NpcArt } from './Npc'
import { useAmbientMusic } from '../audio/SoundToggle'

interface CitySceneProps {
  state: GameState
  /** Where to stand on arrival, when coming through a door. */
  entryTile?: { col: number; row: number } | null
  onAction: (action: PoiAction, poi: PoiDef) => void
  onEnterArea: (areaId: string, col: number, row: number) => void
  onCaught: () => void
}

export function CityScene({ state, entryTile, onAction, onEnterArea, onCaught }: CitySceneProps) {
  const city = CITIES[state.cityId]
  const areaId = state.areaId && city.areas[state.areaId] ? state.areaId : city.entryAreaId
  const area = city.areas[areaId]
  const hunted = state.huntedInCityId === state.cityId
  useAmbientMusic(hunted ? 'tense' : 'overworld')

  const interactables: Interactable[] = area.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    col: poi.col,
    row: poi.row,
    color: poi.color,
    art: poi.art ?? defaultArt(poi),
    lines: linesFor(state, poi),
    onFinish:
      poi.action.kind === 'flavor' || isSpent(state, poi) ? undefined : () => onAction(poi.action, poi),
  }))

  const exits: SceneExit[] = area.exits.map((exit) => ({ col: exit.col, row: exit.row, label: exit.label }))

  // Collectors work the streets. Ducking into a shop buys a moment, but the
  // door puts you straight back out where they are.
  const chaser: ChaserConfig | undefined =
    hunted && areaId === city.entryAreaId
      ? {
          name: 'Collector',
          col: Math.max(1, area.map[0].length - 3),
          row: Math.max(1, Math.min(area.map.length - 2, area.playerStart.row)),
          stepMs: 430,
        }
      : undefined

  const owed = totalOwed(state)
  const due = daysUntilDue(state)

  return (
    <OverworldScene
      key={`${state.cityId}-${areaId}-${hunted}`}
      map={area.map}
      playerStart={entryTile ?? area.playerStart}
      interactables={interactables}
      exits={exits}
      onExit={(exit) => {
        const target = area.exits.find((e) => e.col === exit.col && e.row === exit.row)
        if (target) onEnterArea(target.toAreaId, target.toCol, target.toRow)
      }}
      background={area.background}
      chaser={chaser}
      onCaught={onCaught}
      hud={
        <>
          <div>{area.name}</div>
          <div style={{ color: '#9a9ab0', fontSize: 12 }}>
            {city.name} &middot; Day {state.day}
          </div>
          <div>Cash: ${state.cash.toLocaleString()}</div>
          {owed > 0 && (
            <div style={{ color: due !== null && due < 0 ? '#e05a5a' : '#f2c14e' }}>
              Owed: ${owed.toLocaleString()}
              {due !== null && (due < 0 ? ' — OVERDUE' : ` — due in ${due} day${due === 1 ? '' : 's'}`)}
            </div>
          )}
          {hunted && <div style={{ color: '#e05a5a' }}>They sent someone. Get out of town or pay up.</div>}
        </>
      }
    />
  )
}

function defaultArt(poi: PoiDef): NpcArt {
  if (poi.action.kind === 'shop') return 'counter'
  if (poi.action.kind === 'travel') return 'sign'
  return 'person'
}

/**
 * Winning the home game is a one-time story beat that opens the campaign, not a
 * table you can sit at again for the payout.
 */
function isSpent(state: GameState, poi: PoiDef): boolean {
  return poi.action.kind === 'pokerNight' && state.flags.wonPokerNight
}

function linesFor(state: GameState, poi: PoiDef): string[] {
  if (isSpent(state, poi)) {
    return [
      `${poi.name}: Still talking about that night, man.`,
      `${poi.name}: I'm out of the game for a while. Go win something real.`,
    ]
  }
  if (poi.action.kind !== 'mission') return poi.lines

  const mission = MISSIONS[poi.action.missionId]
  if (!mission) return poi.lines

  switch (missionStatus(state, mission.id)) {
    case 'unseen':
      return mission.brief
    case 'active':
      return [`${poi.name}: Not yet. ${mission.goalText}.`]
    case 'ready':
      return mission.doneText
    case 'done':
      return [`${poi.name}: Good to see you again.`]
  }
}
