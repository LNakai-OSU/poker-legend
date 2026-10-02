import { OverworldScene, type ChaserConfig, type Interactable, type SceneExit } from './OverworldScene'
import { AREAS, CITIES, MISSIONS, collectorSpawn, findArea } from '../world/content'
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
  // Areas resolve globally, not within a city: walking off the edge of a street
  // can take you into the next town, which is the point of the world being one
  // continuous place rather than a set of islands joined by menus.
  const located = findArea(state.areaId) ?? findArea(CITIES[state.cityId].entryAreaId)
  const city = CITIES[located?.cityId ?? state.cityId]
  const area = located?.area ?? city.areas[city.entryAreaId]
  const areaId = area.id
  const hunted = state.huntedInCityId === city.id
  useAmbientMusic(hunted ? 'tense' : 'overworld')

  const interactables: Interactable[] = area.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    col: poi.col,
    row: poi.row,
    color: poi.color,
    art: poi.art ?? defaultArt(poi),
    labelled: poi.labelled,
    lines: linesFor(state, poi),
    onFinish:
      poi.action.kind === 'flavor' || isSpent(state, poi) || isLocked(state, poi)
        ? undefined
        : () => onAction(poi.action, poi),
  }))

  const exits: SceneExit[] = area.exits.map((exit) => ({ col: exit.col, row: exit.row, label: exit.label }))

  // Collectors work the streets. Ducking into a shop buys a moment, but the
  // door puts you straight back out where they are. Where they are, though, is
  // the far end of the street from the way out of town — the chase has to be one
  // the player can actually win by running for the bus.
  const spawnTile = entryTile ?? area.playerStart
  const chaser: ChaserConfig | undefined =
    hunted && areaId === city.entryAreaId
      ? { name: 'Collector', ...collectorSpawn(area, spawnTile), stepMs: 430 }
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
      areaName={area.name}
      theme={city.theme}
      openEdges={
        area.edges
          ? (Object.fromEntries(
              Object.keys(area.edges).map((edge) => [edge, true]),
            ) as Partial<Record<'north' | 'south' | 'east' | 'west', true>>)
          : undefined
      }
      onLeaveEdge={(edge, alongAxis) => {
        const link = area.edges?.[edge]
        if (!link) return
        const destination = AREAS[link.toAreaId]
        if (!destination) return
        const next = destination.area
        const offset = link.offset ?? 0
        // Come out on the matching side, keeping your place along the edge.
        const width = next.map[0].length
        const height = next.map.length
        const clamp = (value: number, max: number) => Math.max(0, Math.min(max - 1, value))
        const landing =
          edge === 'east'
            ? { col: 0, row: clamp(alongAxis + offset, height) }
            : edge === 'west'
              ? { col: width - 1, row: clamp(alongAxis + offset, height) }
              : edge === 'south'
                ? { col: clamp(alongAxis + offset, width), row: 0 }
                : { col: clamp(alongAxis + offset, width), row: height - 1 }
        onEnterArea(link.toAreaId, landing.col, landing.row)
      }}
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

/** A POI whose story flag has not been set yet: visible, talkable, but inert. */
function isLocked(state: GameState, poi: PoiDef): boolean {
  if (!poi.requiresFlag) return false
  return !state.flags[poi.requiresFlag as keyof GameState['flags']]
}

function linesFor(state: GameState, poi: PoiDef): string[] {
  if (isLocked(state, poi)) return poi.lockedLines ?? poi.lines
  // Somebody with more than one thing to say says a different one on another day.
  if (poi.altLines && poi.altLines.length > 0) {
    const pool = [poi.lines, ...poi.altLines]
    return pool[state.day % pool.length]
  }
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
