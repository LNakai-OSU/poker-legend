import { isWalkable } from '../overworld/tiles'
import type { AreaDef } from './types'
import { ENDS_EVENT, type EventAction, type EventCondition, type GameEvent, type Tile } from './events'

/**
 * What an event *does* has to make sense: everybody it names exists, every
 * tile it walks somebody to can be stood on, every question has a way on.
 * Down every branch — an answer three choices deep is as much the game as the
 * first line.
 *
 * Shared by the content tests and the editor, as `canBothFire` is, so a beat
 * the editor would save is a beat the tests pass.
 */

/** The parts of the world an event's actions can name. */
export interface StoryWorld {
  characters: Record<string, { name: string; overworld?: unknown }>
  areas: Record<string, { area: AreaDef; cityId: string }>
  tables: Record<string, unknown>
  cityIds: string[]
  itemIds: string[]
  lessonIds: string[]
  sponsorIds: string[]
  eventIds: string[]
}

/** Most answers a question can offer: four is what fits on a phone, and what a person can weigh at once. */
export const MAX_OPTIONS = 4
/** Longest an answer's label can be: it is a button. */
export const MAX_LABEL = 44

/** Problems with one condition's references: an event, item, lesson or sponsor that does not exist. */
export function conditionProblems(condition: EventCondition, world: StoryWorld, ownId: string): string[] {
  switch (condition.kind) {
    case 'eventDone':
      return condition.eventId === ownId || world.eventIds.includes(condition.eventId)
        ? []
        : [`it asks about "${condition.eventId}", which is not an event`]
    case 'hasItem':
      return world.itemIds.includes(condition.itemId) ? [] : [`it asks for "${condition.itemId}", which is not an item`]
    case 'hasLesson':
      return world.lessonIds.includes(condition.lessonId) ? [] : [`it asks for "${condition.lessonId}", which is not a lesson`]
    case 'debt':
    case 'hunted':
    case 'count':
    case 'canPay':
      return condition.sponsorId !== undefined && !world.sponsorIds.includes(condition.sponsorId)
        ? [`it asks about "${condition.sponsorId}", who is not a sponsor`]
        : []
    default:
      return []
  }
}

/** The area an event starts in, when its trigger says: walking in, a tile, a fixture. */
export function areaOfTrigger(event: GameEvent, world: StoryWorld): string | null {
  const trigger = event.trigger
  switch (trigger.kind) {
    case 'enterArea':
    case 'standOn':
      return trigger.areaId
    case 'interact': {
      for (const [areaId, { area }] of Object.entries(world.areas)) {
        if (area.pois.some((poi) => poi.id === trigger.poiId)) return areaId
      }
      return null
    }
    default:
      // Talking to somebody happens wherever their hours put them.
      return null
  }
}

/**
 * Everything wrong with what an event does, as sentences naming where:
 * "step 3, answer “Stake him”, step 1 …".
 */
export function actionProblems(event: GameEvent, world: StoryWorld): string[] {
  const problems: string[] = []
  const area = (areaId: string | null) => (areaId ? world.areas[areaId]?.area : undefined)
  const standable = (where: string | null, tile: Tile, what: string, at: string) => {
    const map = area(where)
    if (map && !isWalkable(map.map, tile.col, tile.row)) {
      problems.push(`${at} ${what} (${tile.col},${tile.row}) in ${map.name}, which is a wall`)
    }
  }
  const named = (id: string, at: string, what: string) => {
    if (!world.characters[id]) problems.push(`${at} ${what} "${id}", who is nobody`)
  }

  /** Checks a list; returns the area the player is in at its end, as far as anybody can tell. */
  const check = (actions: EventAction[], where: string | null, label: string): string | null => {
    let here = where
    let ended: string | null = null
    actions.forEach((action, i) => {
      const at = `${label}step ${i + 1}`
      if (ended) problems.push(`${at} never happens: ${ended} ends the event before it`)
      switch (action.kind) {
        case 'dialogue':
          if (action.lines.length === 0) problems.push(`${at} is dialogue with no lines`)
          if (action.speaker && action.speaker === action.speaker.toLowerCase()) named(action.speaker, at, 'is spoken by')
          break
        case 'choice': {
          if (action.speaker && action.speaker === action.speaker.toLowerCase()) named(action.speaker, at, 'is asked by')
          if (action.prompt.trim().length === 0) problems.push(`${at} asks nothing: write the question`)
          if (action.options.length < 2 || action.options.length > MAX_OPTIONS) {
            problems.push(`${at} offers ${action.options.length} answer${action.options.length === 1 ? '' : 's'}: a choice has 2 to ${MAX_OPTIONS}`)
          }
          if (!action.options.some((o) => (o.conditions ?? []).length === 0)) {
            problems.push(`${at} could leave the player with no answer: give one answer no conditions`)
          }
          const labels = action.options.map((o) => o.label.trim())
          action.options.forEach((option, n) => {
            const which = `${at}, answer ${n + 1}`
            if (labels[n].length === 0) problems.push(`${which} has no label`)
            if (labels[n].length > MAX_LABEL) problems.push(`${which} is ${labels[n].length} characters: keep a label to ${MAX_LABEL}`)
            if (labels.indexOf(labels[n]) !== n) problems.push(`${which} says the same as another answer`)
            for (const condition of option.conditions ?? []) {
              for (const p of conditionProblems(condition, world, event.id)) problems.push(`${which}: ${p}`)
            }
            check(option.then, here, `${which} (“${option.label}”), `)
          })
          break
        }
        case 'if':
          if (action.when.length === 0) problems.push(`${at} asks nothing: an if needs a condition`)
          for (const condition of action.when) {
            for (const p of conditionProblems(condition, world, event.id)) problems.push(`${at}: ${p}`)
          }
          check(action.then, here, `${at}, if so, `)
          if (action.else) check(action.else, here, `${at}, otherwise, `)
          break
        case 'moveNpc':
          named(action.characterId, at, 'moves')
          if (action.from) standable(here, action.from, 'brings them on at', at)
          if (action.to !== 'player') standable(here, action.to, 'walks them to', at)
          break
        case 'movePlayer':
          standable(here, action.to, 'walks you to', at)
          break
        case 'startTable':
        case 'unlockTable':
          if (!world.tables[action.tableId]) problems.push(`${at} points at table "${action.tableId}", which does not exist`)
          break
        case 'teleport':
        case 'ride': {
          const map = area(action.areaId)
          const verb = action.kind === 'ride' ? 'rides you to' : 'sends you to'
          if (!map) problems.push(`${at} ${verb} "${action.areaId}", which is not an area`)
          else if (!isWalkable(map.map, action.col, action.row)) {
            problems.push(`${at} puts you inside a wall in ${map.name} (${action.col},${action.row})`)
          }
          for (const id of action.with ?? []) named(id, at, 'brings along')
          if (action.kind === 'ride') check(action.during ?? [], here, `${at}, on the bus, `)
          here = action.areaId
          break
        }
        case 'takeStake':
        case 'repay':
          if (!world.sponsorIds.includes(action.sponsorId)) problems.push(`${at} names "${action.sponsorId}", who is not a sponsor`)
          break
        case 'unlockCity':
          if (!world.cityIds.includes(action.cityId)) problems.push(`${at} opens "${action.cityId}", which is not a city`)
          break
        case 'giveItem':
          if (!world.itemIds.includes(action.itemId)) problems.push(`${at} gives "${action.itemId}", which is not an item`)
          break
        default:
          break
      }
      if (ENDS_EVENT.has(action.kind) && !ended) ended = action.kind === 'startTable' ? 'sitting down at the table' : 'the poker night'
    })
    return here
  }

  check(event.actions, areaOfTrigger(event, world), '')
  return problems
}
