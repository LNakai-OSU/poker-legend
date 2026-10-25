import { CHARACTERS, allSchedules, type CharacterDef } from '../world/characters'
import { EVENTS, arrivalClashes, canBothFire, everyAction, eventsSharing, type GameEvent } from '../world/events'
import { actionProblems, conditionProblems } from '../world/eventChecks'
import { AREAS, CITIES, LESSONS, SPONSORS, TABLES, allShopItems } from '../world/content'
import { isWalkable } from '../overworld/tileRenderer'
import type { AreaDef, TableDef } from '../world/types'
import { characterShapeProblems, eventShapeProblems } from './contentModel'

/**
 * The content rules, applied to a character or event that is not in the game yet.
 *
 * A deliberate echo of `content.test.ts` and `events.test.ts`, the way the map
 * editor's checks echo the map rules: the editor cannot import the tests, so it
 * restates the ones about people and story beats. Every message here is a test
 * that would fail if the thing were saved as it stands — which is why the save
 * endpoint runs these too, and refuses while any remain.
 *
 * The world is passed in rather than imported, so a check can be made against
 * the world as it would be after the save (and so the tests can build one).
 */

export interface World {
  characters: Record<string, CharacterDef>
  events: GameEvent[]
  areas: Record<string, { area: AreaDef; cityId: string }>
  tables: Record<string, TableDef>
  cityIds: string[]
  itemIds: string[]
  lessonIds: string[]
  sponsorIds: string[]
}

/** The world as the game has it now. */
export function gameWorld(): World {
  return {
    characters: CHARACTERS,
    events: EVENTS,
    areas: AREAS,
    tables: TABLES,
    cityIds: Object.keys(CITIES),
    itemIds: allShopItems().map((item) => item.id),
    lessonIds: Object.keys(LESSONS),
    sponsorIds: Object.keys(SPONSORS),
  }
}

const approachTiles = (col: number, row: number) => [
  [col, row + 1],
  [col, row - 1],
  [col - 1, row],
  [col + 1, row],
]

/** Every fixture in the game, by id, with the area it is in. */
export function poisOf(world: World): Map<string, { name: string; areaId: string }> {
  const found = new Map<string, { name: string; areaId: string }>()
  for (const [areaId, { area }] of Object.entries(world.areas)) {
    for (const poi of area.pois) found.set(poi.id, { name: poi.name, areaId })
  }
  return found
}

/**
 * Everything that would fail a content test if this character were saved.
 *
 * `id` is the character's id; `world.characters` is everybody else as they are
 * now, and is consulted with this one swapped in.
 */
export function characterProblems(id: string, character: CharacterDef, world: World): string[] {
  return withShape(characterShapeProblems(character, id), () => characterRules(id, character, world))
}

/**
 * Shape problems first, then the content rules — both, so a blank line does not
 * hide the fact that the event also has no description. The rules assume the
 * shape is right; when it is so wrong that they cannot run, the shape problems
 * are what there is to say.
 */
function withShape(shape: string[], rules: () => string[]): string[] {
  if (shape.length === 0) return rules()
  try {
    return [...shape, ...rules().filter((problem) => !shape.includes(problem))]
  } catch {
    return shape
  }
}

function characterRules(id: string, character: CharacterDef, world: World): string[] {
  const problems: string[] = []
  const name = character.name || id
  const everyone = { ...world.characters, [id]: character }

  // the opponents
  if (character.seat) {
    if (!character.style.trim()) problems.push(`${name} plays but has no line under their name`)
    if (!character.lines.greeting?.length) problems.push(`${name} plays but says nothing when you sit down`)
  }
  for (const table of Object.values(world.tables)) {
    for (const ref of table.opponents) {
      const seated = typeof ref === 'string' ? ref : ref.character
      if (seated !== id) continue
      if (!character.seat) {
        problems.push(`${table.name} seats ${name}, who no longer plays — give them a seat`)
      } else if (!character.seat.archetype) {
        problems.push(`${name} sits at ${table.name} with no playing style — choose an archetype`)
      }
      if (typeof ref !== 'string' && ref.persona && !character.personas?.[ref.persona]) {
        problems.push(`${table.name} seats ${name} as "${ref.persona}", which they no longer have`)
      }
    }
  }

  // events that wait for them
  for (const event of world.events) {
    if (event.trigger.kind === 'talkTo' && event.trigger.characterId === id && !character.overworld) {
      problems.push(`the event "${event.id}" waits to talk to ${name}, who would never be out in the town`)
    }
  }

  // the town keeps its own hours
  const presence = character.overworld
  if (presence) {
    const schedules = allSchedules(character)
    if (schedules.every((schedule) => schedule.length === 0)) {
      problems.push(`${name} is out in the town but keeps no hours at all — add where they are, or take them out of the town`)
    }
    for (const schedule of schedules) {
      const periods = new Set<string>()
      for (const entry of schedule) {
        const when = `in the ${entry.period}`
        if (periods.has(entry.period)) problems.push(`${name} is in two places at once ${when}`)
        periods.add(entry.period)

        const area = world.areas[entry.areaId]?.area
        if (!area) {
          problems.push(`${name} is scheduled into "${entry.areaId}", which is not an area`)
          continue
        }
        if (!isWalkable(area.map, entry.col, entry.row)) {
          problems.push(`${name} stands in a wall in ${area.name} (${entry.col},${entry.row}) ${when}`)
        } else if (!approachTiles(entry.col, entry.row).some(([c, r]) => isWalkable(area.map, c, r))) {
          problems.push(`nobody can walk up to ${name} in ${area.name} ${when}`)
        }
        const poi = area.pois.find((p) => p.col === entry.col && p.row === entry.row)
        if (poi) problems.push(`${name} stands on ${poi.name} in ${area.name} ${when}`)
        const door = area.exits.find((e) => e.col === entry.col && e.row === entry.row)
        if (door) problems.push(`${name} stands in the ${door.label} doorway ${when}`)

        for (const [otherId, other] of Object.entries(everyone)) {
          if (otherId === id) continue
          const clash = allSchedules(other).flat().find(
            (o) => o.period === entry.period && o.areaId === entry.areaId && o.col === entry.col && o.row === entry.row,
          )
          if (clash) problems.push(`${name} and ${other.name} stand on the same tile ${when}`)
        }
      }
    }
  }
  return problems
}

/** Whether two events can be told apart by their conditions alone — as `events.test.ts` decides it. */
export function conditionsDistinguish(a: GameEvent, b: GameEvent): boolean {
  return !canBothFire(a, b)
}

/**
 * Everything that would fail a content test if this event were saved.
 *
 * `originalId` is the id it is saved over, or null for a new event, so that it
 * is not compared against its own old self.
 */
export function eventProblems(event: GameEvent, originalId: string | null, world: World): string[] {
  return withShape(eventShapeProblems(event, event.id || 'event'), () => eventRules(event, originalId, world))
}

function eventRules(event: GameEvent, originalId: string | null, world: World): string[] {
  const problems: string[] = []
  const others = world.events.filter((other) => other.id !== originalId)

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(event.id)) problems.push(`"${event.id}" is not an event id: lower-case words joined with hyphens`)
  if (others.some((other) => other.id === event.id)) problems.push(`another event is already called "${event.id}"`)
  if (event.about.trim().length <= 10) problems.push('say what this event is for, in a sentence')
  if (event.actions.length === 0) problems.push('this event does nothing')

  // when
  const trigger = event.trigger
  const area = (areaId: string) => world.areas[areaId]?.area
  switch (trigger.kind) {
    case 'talkTo': {
      const character = world.characters[trigger.characterId]
      if (!character) problems.push(`it waits for "${trigger.characterId}", who does not exist`)
      else if (!character.overworld) {
        problems.push(`it waits to talk to ${character.name}, who is never out in the town`)
      }
      break
    }
    case 'interact':
      if (!poisOf(world).has(trigger.poiId)) problems.push(`it waits for a fixture "${trigger.poiId}", which does not exist`)
      break
    case 'enterArea':
      if (!area(trigger.areaId)) problems.push(`it waits for "${trigger.areaId}", which is not an area`)
      break
    case 'standOn': {
      const where = area(trigger.areaId)
      if (!where) problems.push(`it waits for "${trigger.areaId}", which is not an area`)
      else if (!isWalkable(where.map, trigger.col, trigger.row)) {
        problems.push(`nobody can stand on (${trigger.col},${trigger.row}) in ${where.name}: it is a wall`)
      }
      break
    }
  }

  // what has to be true
  const story = { ...world, eventIds: others.map((o) => o.id) }
  for (const condition of event.conditions ?? []) problems.push(...conditionProblems(condition, story, event.id))

  // at most one event per moment
  for (const rival of eventsSharing(others, trigger)) {
    if (!conditionsDistinguish(event, rival)) {
      problems.push(
        `it and "${rival.id}" share a trigger and could both fire — add a flag, an hour or a chapter that tells them apart`,
      )
    }
  }

  // somebody else's beat for walking into wherever this one takes you
  const withThis = [...others, event]
  for (const [carrier, arrival] of arrivalClashes(withThis)) {
    if (carrier === event) {
      problems.push(
        `it takes you somewhere "${arrival.id}" fires on walking into, and both could be ready — set a flag on the way that tells them apart`,
      )
    } else if (arrival === event) {
      problems.push(`"${carrier.id}" takes you in here while it could fire too — tell them apart by a flag "${carrier.id}" sets on the way`)
    }
  }

  // what happens, down every branch
  problems.push(...actionProblems(event, story))

  // the night that opens the campaign
  if (originalId === 'poker-night') {
    if (!everyAction(event.actions).some((a) => a.kind === 'startPokerNight')) problems.push('the first poker night has to start the poker night')
    if (event.repeatable) problems.push('the first poker night cannot be played again')
  }
  return problems
}
