import { OverworldScene, type ChaserConfig, type Interactable, type SceneExit } from './OverworldScene'
import { AREAS, CITIES, MISSIONS, collectorSpawn, findArea } from '../world/content'
import { isWalkable } from './tileRenderer'
import { missionStatus } from '../game/progression'
import { daysUntilDue, totalOwed, type GameState, type StoryFlag } from '../game/state'
import type { PoiAction, PoiDef } from '../world/types'
import type { NpcArt } from './Npc'
import { useAmbientMusic } from '../audio/SoundToggle'
import { PERIOD_LABEL, PERIOD_LIGHT } from '../game/time'
import { charactersIn } from '../world/characters'
import { EVENTS, eventFor, type GameEvent } from '../world/events'

interface CitySceneProps {
  state: GameState
  /** Where to stand on arrival, when coming through a door. */
  entryTile?: { col: number; row: number } | null
  onAction: (action: PoiAction, poi: PoiDef) => void
  onEnterArea: (areaId: string, col: number, row: number) => void
  onCaught: () => void
  /** Hand a scripted beat to the runner. Without it, events do not fire. */
  onEvent?: (event: GameEvent) => void
  /** Anybody an event has stood somewhere other than their scheduled tile. */
  moved?: Record<string, { col: number; row: number }>
}

export function CityScene({
  state,
  entryTile,
  onAction,
  onEnterArea,
  onCaught,
  onEvent,
  moved,
}: CitySceneProps) {
  // Areas resolve globally, not within a city: walking off the edge of a street
  // can take you into the next town, which is the point of the world being one
  // continuous place rather than a set of islands joined by menus.
  const located = findArea(state.areaId) ?? findArea(CITIES[state.cityId].entryAreaId)
  const city = CITIES[located?.cityId ?? state.cityId]
  const area = located?.area ?? city.areas[city.entryAreaId]
  const areaId = area.id
  const hunted = state.huntedInCityId === city.id
  useAmbientMusic(hunted ? 'tense' : 'overworld')

  // Falling back to the area's own start if the tile handed in is not somewhere
  // you could actually stand: out of bounds, or inside a wall. Without this a
  // stale coordinate strands the player off the edge of the map with no way to
  // move at all.
  const landing =
    entryTile && isWalkable(area.map, entryTile.col, entryTile.row) ? entryTile : area.playerStart

  const interactables: Interactable[] = [
    ...area.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      col: poi.col,
      row: poi.row,
      color: poi.color,
      art: poi.art ?? defaultArt(poi),
      labelled: poi.labelled,
      lines: linesFor(state, poi),
      onFinish:
        poi.action.kind === 'flavor' || isLocked(state, poi)
          ? undefined
          : () => onAction(poi.action, poi),
    })),
    // Whoever the hour puts here. A POI is part of the map and is always in it;
    // these are people, and where they are depends on when you came.
    ...charactersIn(areaId, state.period).map(({ id, character, at }) => {
      // Somebody with something scripted to say says that instead of their
      // usual line for the hour.
      const event = onEvent ? eventFor(EVENTS, { kind: 'talkTo', characterId: id }, state) : undefined
      const placed = moved?.[id] ?? at
      return {
        id: `character-${id}`,
        name: character.name,
        col: placed.col,
        row: placed.row,
        color: character.overworld?.color ?? SCHEDULED_CHARACTER_COLOR,
        art: character.overworld?.art ?? ('person' as NpcArt),
        lines: at.lines ?? character.overworld?.lines ?? [],
        onTalk: event && onEvent ? () => (onEvent(event), true) : undefined,
      }
    }),
  ]

  // A scheduled character standing on a tile the map does not allow is a content
  // bug, and `content.test.ts` fails on it rather than letting somebody be
  // unreachable in the corner of a wall.

  const exits: SceneExit[] = area.exits.map((exit) => ({ col: exit.col, row: exit.row, label: exit.label }))

  // Collectors work the streets. Ducking into a shop buys a moment, but the
  // door puts you straight back out where they are. Where they are, though, is
  // the far end of the street from the way out of town — the chase has to be one
  // the player can actually win by running for the bus.
  const spawnTile = landing
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
      playerStart={landing}
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
        const along = edge === 'north' || edge === 'south' ? width : height
        const landingAlong = clamp(alongAxis + offset, along)
        const at = (value: number) =>
          edge === 'east'
            ? { col: 0, row: value }
            : edge === 'west'
              ? { col: width - 1, row: value }
              : edge === 'south'
                ? { col: value, row: 0 }
                : { col: value, row: height - 1 }

        // Two maps rarely have exactly the same shape along a shared side, so the
        // tile straight across can be a tree. Step along the edge to the nearest
        // one that is actually ground rather than putting the player inside it.
        let landing = at(landingAlong)
        if (!isWalkable(next.map, landing.col, landing.row)) {
          for (let distance = 1; distance < along; distance++) {
            const candidates = [landingAlong - distance, landingAlong + distance].filter(
              (value) => value >= 0 && value < along,
            )
            const found = candidates.map(at).find((tile) => isWalkable(next.map, tile.col, tile.row))
            if (found) {
              landing = found
              break
            }
          }
        }
        onEnterArea(link.toAreaId, landing.col, landing.row)
      }}
      light={PERIOD_LIGHT[state.period]}
      hud={
        <>
          <div>{area.name}</div>
          <div style={{ color: '#9a9ab0', fontSize: 12 }}>
            {city.name} &middot; Day {state.day} &middot; {PERIOD_LABEL[state.period]}
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

/** The name plate colour for somebody who is here because of the hour. */
const SCHEDULED_CHARACTER_COLOR = 0x6ea8fe

function defaultArt(poi: PoiDef): NpcArt {
  if (poi.action.kind === 'shop') return 'counter'
  if (poi.action.kind === 'travel') return 'sign'
  return 'person'
}

/** A POI whose story flag has not been set yet: visible, talkable, but inert. */
function isLocked(state: GameState, poi: PoiDef): boolean {
  if (!poi.requiresFlag) return false
  return !state.flags[poi.requiresFlag as StoryFlag]
}

function linesFor(state: GameState, poi: PoiDef): string[] {
  if (isLocked(state, poi)) return poi.lockedLines ?? poi.lines
  // Somebody with more than one thing to say says a different one on another day.
  if (poi.altLines && poi.altLines.length > 0) {
    const pool = [poi.lines, ...poi.altLines]
    return pool[state.day % pool.length]
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
