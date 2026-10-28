import { OverworldScene, type ChaserConfig, type Interactable, type SceneCue, type SceneExit } from './OverworldScene'
import { AREAS, CITIES, MISSIONS, SPONSORS, collectorSpawn, findArea } from '../world/content'
import { isWalkable } from './tileRenderer'
import { missionStatus } from '../game/progression'
import { daysUntilDue, huntingSponsorId, totalOwed, type GameState, type StoryFlag } from '../game/state'
import type { PoiAction, PoiDef } from '../world/types'
import type { NpcArt } from './Npc'
import { useAmbientMusic } from '../audio/SoundToggle'
import { PERIOD_LABEL } from '../game/time'
import { CHARACTERS, charactersIn } from '../world/characters'
import { EVENTS, eventFor, type GameEvent } from '../world/events'
import { artForPoi, verbForPoi, figureForCharacter, figuresForPois, figuresForSitters } from './casting'
import { seatingFor } from '../world/seating'
import type { SeatedConfig } from './sitters'
import type { CastPlace, Cue } from '../game/eventMachine'
import { besideTile } from './paths'

/** How fast a beat walks somebody, in pixels a second: a stroll beside you, or a run to catch you. */
const PACE_SPEED = { walk: 118, run: 250 } as const

interface CitySceneProps {
  state: GameState
  /** Where to stand on arrival, when coming through a door. */
  entryTile?: { col: number; row: number } | null
  onAction: (action: PoiAction, poi: PoiDef) => void
  onEnterArea: (areaId: string, col: number, row: number) => void
  onCaught: () => void
  /** Hand a scripted beat to the runner. Without it, events do not fire. */
  onEvent?: (event: GameEvent) => void
  /** Where beats have put people: somewhere other than their usual tile, or somewhere they do not usually go. */
  cast?: Record<string, CastPlace>
  /** Walks a beat has asked for. */
  cues?: Cue[]
  onCueDone?: (id: number, at?: { col: number; row: number }) => void
  /** Set while an event has the screen: the street holds still until it is done. */
  paused?: boolean
}

export function CityScene({
  state,
  entryTile,
  onAction,
  onEnterArea,
  onCaught,
  onEvent,
  cast = {},
  cues = [],
  onCueDone,
  paused,
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

  // Whoever the hour puts here. A POI is part of the map and is always in it;
  // these are people, and where they are depends on when you came. Each is
  // drawn as themselves: the Marcus in the street is the Marcus at the table.
  // A beat can take somebody away from their usual place, and bring somebody
  // who is not usually here: Dana, walking you to the bus.
  const castHere = Object.entries(cast).filter(([, place]) => place.areaId === areaId)
  const usual = charactersIn(areaId, state.period, state).filter(
    (entry) => !cast[entry.id] || cast[entry.id].areaId === areaId,
  )
  const visiting = castHere
    .map(([id]) => id)
    .filter((id) => !usual.some((entry) => entry.id === id) && CHARACTERS[id])
    .map((id) => ({ id, character: CHARACTERS[id], at: { col: -1, row: -1 }, lines: CHARACTERS[id].overworld?.lines ?? [] }))
  // Somebody who came with you stands beside where you land, on a tile nobody
  // else is standing on.
  const taken = new Set<string>([
    ...area.pois.map((p) => `${p.col},${p.row}`),
    ...usual.map((e) => `${e.at.col},${e.at.row}`),
    `${landing.col},${landing.row}`,
  ])
  const placeOf = (id: string, at: { col: number; row: number }) => {
    const place = cast[id]
    if (!place || place.areaId !== areaId) return at
    if ('beside' in place) {
      const spot = besideTile(area.map, landing, (c, r) => taken.has(`${c},${r}`))
      taken.add(`${spot.col},${spot.row}`)
      return spot
    }
    return { col: place.col, row: place.row }
  }
  const scheduled = [...usual, ...visiting].map((entry) => ({
    ...entry,
    at: placeOf(entry.id, entry.at),
    figure: figureForCharacter(entry.id, entry.character),
  }))
  // Everybody standing at a POI, dressed for what they do and made up from
  // their id, with nobody in the street the double of anybody else in it.
  const figures = figuresForPois(area.pois, CHARACTERS, scheduled.map((s) => s.figure))
  // Who is sitting at the tables. Worked out from the map, so a table looks the
  // same every time you come in; nobody sits where somebody is already standing
  // — wherever the hour or a beat has put them — where you are about to, or
  // where a beat is walking somebody to or from.
  const walks = cues
    .filter((cue) => cue.areaId === areaId)
    .flatMap((cue) => [...(cue.to === 'player' ? [] : [cue.to]), ...(cue.from ? [cue.from] : [])])
  const seatings = seatingFor(area, {
    present: scheduled.map(({ id, at }) => ({ id, col: at.col, row: at.row })),
    keepClear: [landing, ...walks],
  })
  const sitters = seatings.flatMap((table) => table.sitters)
  const chairs = seatings.flatMap((table) =>
    table.tableId ? table.open.map((seat) => ({ col: seat.col, row: seat.row, tableId: table.tableId! })) : [],
  )
  const sitterFigures = figuresForSitters(sitters, CHARACTERS, [
    ...scheduled.map((s) => s.figure),
    ...figures.values(),
  ])
  const seated: SeatedConfig[] = sitters.map((sitter) => ({ sitter, figure: sitterFigures.get(sitter.id)! }))
  // A person on a tile you cannot walk on is behind the furniture there — the
  // clerk at the counter, the dealer at the table — and is drawn that way.
  const behind = (col: number, row: number) => !isWalkable(area.map, col, row)

  const interactables: Interactable[] = [
    ...area.pois.map((poi) => {
      const art = artForPoi(poi)
      const role = figures.get(poi.id)?.role
      // A beat written for this fixture gets first refusal, as it does for a
      // person: Hal introduces himself before he sells you anything, and the
      // next time you talk to him he opens the book.
      const event = onEvent ? eventFor(EVENTS, { kind: 'interact', poiId: poi.id }, state) : undefined
      return {
        id: poi.id,
        name: poi.name,
        col: poi.col,
        row: poi.row,
        art,
        figure: figures.get(poi.id),
        behind: art === 'person' && behind(poi.col, poi.row),
        // Furniture behind them too is the back of a counter, not the bench of a booth.
        counter: art === 'person' && behind(poi.col, poi.row) && behind(poi.col, poi.row - 1),
        // People at a post keep their eyes on it; everybody else looks about.
        restless: art === 'person' && !behind(poi.col, poi.row) && (role === 'local' || role === 'tourist' || role === 'kid'),
        labelled: poi.labelled,
        verb: verbForPoi(poi),
        lines: linesFor(state, poi),
        onFinish:
          poi.action.kind === 'flavor' || isLocked(state, poi)
            ? undefined
            : () => onAction(poi.action, poi),
        onTalk: event && onEvent ? () => (onEvent(event), true) : undefined,
      }
    }),
    ...scheduled.map(({ id, character, at, lines, figure }) => {
      // Somebody with something scripted to say says that instead of their
      // usual line for the hour.
      const event = onEvent ? eventFor(EVENTS, { kind: 'talkTo', characterId: id }, state) : undefined
      const placed = at
      return {
        id: `character-${id}`,
        name: character.name,
        col: placed.col,
        row: placed.row,
        color: character.overworld?.color ?? SCHEDULED_CHARACTER_COLOR,
        art: character.overworld?.art ?? ('person' as NpcArt),
        figure,
        behind: behind(placed.col, placed.row),
        counter: behind(placed.col, placed.row) && behind(placed.col, placed.row - 1),
        restless: !behind(placed.col, placed.row),
        lines,
        onTalk: event && onEvent ? () => (onEvent(event), true) : undefined,
      }
    }),
  ]

  // A scheduled character standing on a tile the map does not allow is a content
  // bug, and `content.test.ts` fails on it rather than letting somebody be
  // unreachable in the corner of a wall.

  // Doors in a street are signposted; the way out of a room is not, or its name
  // sits under the feet of whoever is standing on the mat.
  const outdoors = !!area.edges
  const exits: SceneExit[] = area.exits.map((exit) => ({ col: exit.col, row: exit.row, label: exit.label, signed: outdoors }))

  // Collectors work the streets. Ducking into a shop buys a moment, but the
  // door puts you straight back out where they are. Where they are, though, is
  // the far end of the street from the way out of town — the chase has to be one
  // the player can actually win by running for the bus.
  // They are somebody: the sponsor's own collector, the face that stands over
  // you when they catch you.
  const spawnTile = landing
  const collectorId = hunted ? SPONSORS[huntingSponsorId(state) ?? '']?.collector : undefined
  const collector = collectorId ? CHARACTERS[collectorId] : undefined
  const chaser: ChaserConfig | undefined =
    hunted && areaId === city.entryAreaId
      ? {
          name: collector?.name ?? 'Collector',
          figure: collector && collectorId ? figureForCharacter(collectorId, collector) : undefined,
          ...collectorSpawn(area, spawnTile),
          stepMs: 430,
        }
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
      openChairs={chairs}
      onSit={(tableId) => {
        const dealer = area.pois.find((p) => p.action.kind === 'table' && p.action.tableId === tableId)
        if (dealer) onAction({ kind: 'table', tableId }, dealer)
      }}
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
      period={state.period}
      paused={paused}
      cues={cues
        .filter((cue) => cue.areaId === areaId)
        .map(
          (cue): SceneCue => ({
            id: cue.id,
            who: cue.who === 'player' ? 'player' : `character-${cue.who}`,
            to: cue.to,
            speed: PACE_SPEED[cue.pace],
            youFollow: cue.youFollow,
            leaves: cue.leaves,
          }),
        )}
      onCueDone={onCueDone}
      outdoors={outdoors}
      stamps={area.stamps}
      seated={seated}
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

/**
 * The colour of a name over somebody who is here because of the hour — a
 * character you know — as opposed to the white of somebody who lives here.
 */
const SCHEDULED_CHARACTER_COLOR = 0x8ec4ff

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
