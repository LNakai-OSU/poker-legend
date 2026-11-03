import { allHold, type EventCondition } from './events'
import { AREAS, CITIES } from './content'
import { CHARACTERS } from './characters'
import { goalStatus, theCasino } from '../game/progression'
import { TOWN_ORDER, type CityId, type GameState } from '../game/state'
import type { PoiAction } from './types'

/**
 * What to do next, while the story is the only thing asking.
 *
 * In a casino town the Jobs page leads with the town's goal. Before the first
 * town there is no goal, and the page said "Nobody has asked you for anything
 * yet" from the first tick of a new game to the morning Marcus walks you to the
 * bus, through the night you might lose his game. Each step is a line and the
 * conditions it holds under; the page shows the one that holds. No two may hold
 * at once (`nextSteps.test.ts`), so the order here is only for reading.
 */
export interface NextStep {
  id: string
  when: EventCondition[]
  line: string
  /** The same, short enough for the overworld's corner: it follows "Next: ". */
  hud: string
  /** Where the overworld points you (`world/wayfinding.ts`). */
  goTo: Destination
}

/**
 * Somewhere to be. The overworld points along the walk to the area, and once
 * you are in it, at whoever or whatever you came for.
 */
export interface Destination {
  areaId: string
  /** Somebody to walk up to, when they are here. */
  characterId?: string
  /** A fixture to walk up to: a bus stop, a door attendant. */
  poiId?: string
}

const gameNotPlayed: EventCondition = { kind: 'eventDone', eventId: 'poker-night', done: false }
const gamePlayed: EventCondition = { kind: 'eventDone', eventId: 'poker-night' }

export const NEXT_STEPS: NextStep[] = [
  {
    id: 'go-outside',
    // A new game, after the film: Dana is at the end of your street.
    when: [{ kind: 'flag', flag: 'metDana', set: false }, gameNotPlayed],
    line: 'Go outside. Someone is looking for you.',
    hud: 'go outside',
    goTo: { areaId: 'basin' },
  },
  {
    id: 'dana-at-the-stop',
    // You told Dana you had a stop to make first (`dana-walks-you-to-the-bus`).
    when: [{ kind: 'flag', flag: 'metDana' }, { kind: 'flag', flag: 'danaAtTheStop' }, gameNotPlayed],
    line: 'Dana is waiting at the bus stop: east along Seventh Street, at the depot. The 14 goes to Marcus’s game.',
    hud: 'Dana, at the bus depot',
    goTo: { areaId: 'depot' },
  },
  {
    id: 'marcus-game',
    when: [{ kind: 'flag', flag: 'metDana' }, { kind: 'flag', flag: 'danaAtTheStop', set: false }, gameNotPlayed],
    line: 'Marcus’s game: north of the bus depot in Eastgate, the middle door. Talk to Marcus to sit down.',
    hud: 'Marcus’s poker game, Eastgate',
    goTo: { areaId: 'marcus-house', characterId: 'marcus' },
  },
  {
    id: 'deal-again',
    // Up from his table without the money (`poker-night-lost`).
    when: [gamePlayed, { kind: 'flag', flag: 'wonPokerNight', set: false }],
    line: 'Marcus will deal you back in: Eastgate, the middle door, any time from the afternoon. Talk to him.',
    hud: 'Marcus’s game again, Eastgate',
    goTo: { areaId: 'marcus-house', characterId: 'marcus' },
  },
  {
    id: 'marcus-at-the-door',
    // The morning after the win (`dana-walks-you-home`), till he leaves you in Silver Creek.
    when: [
      gamePlayed,
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'flag', flag: 'marcusSeesYouOff' },
      { kind: 'chapter', cityId: 'apartment' },
    ],
    line: 'Marcus is at your door. Go outside: he is riding the 14 out to Silver Creek with you.',
    hud: 'Marcus, outside your door',
    goTo: { areaId: 'basin' },
  },
]

/** The line the Jobs page leads with, or null once a town's goal is doing that. */
export function nextStep(state: GameState): string | null {
  return NEXT_STEPS.find((step) => allHold(step.when, state))?.line ?? null
}

/** What the overworld's corner says is next, and where it points. */
export interface Heading {
  /** Follows "Next: ". */
  hud: string
  goTo: Destination | null
  /** A town's winnings against what opens the private room, for a bar under the line. */
  progress?: { won: number; target: number }
}

/**
 * What is next, for the overworld: the story's step while it has one, and
 * after that the goal of the town you are in — win on its floor, beat its boss
 * in the private room, take the bus on. Every town's goal already names its
 * floor and its room (`world/goals.ts`), so a new town is pointed through
 * without a line of its own here.
 */
export function nextHeading(state: GameState, cityId: CityId = state.cityId): Heading | null {
  const step = NEXT_STEPS.find((s) => allHold(s.when, state))
  if (step) return { hud: step.hud, goTo: step.goTo }
  const status = goalStatus(state, cityId)
  if (status?.phase === 'win') {
    const won = state.casino.net[cityId] ?? 0
    const more = won > 0 ? `$${(status.goal.winTarget - won).toLocaleString()} more` : `$${status.goal.winTarget.toLocaleString()}`
    return {
      hud: `win ${more} at ${theCasino(status.goal.casino)}`,
      goTo: { areaId: status.goal.floorAreaId },
      progress: { won, target: status.goal.winTarget },
    }
  }
  if (status?.phase === 'boss') {
    const { bossId, roomAreaId, tableId } = status.goal
    const boss = CHARACTERS[bossId]?.name ?? 'the boss'
    // The boss sits at the table; it is the dealer who seats you.
    const dealer = AREAS[roomAreaId]?.area.pois.find((p) => p.action.kind === 'table' && p.action.tableId === tableId)
    return { hud: `beat ${boss} in the private room`, goTo: { areaId: roomAreaId, poiId: dealer?.id } }
  }
  if (status?.phase === 'done') {
    const onward = TOWN_ORDER[TOWN_ORDER.indexOf(cityId) + 1]
    if (!onward) return null
    return { hud: `the bus to ${CITIES[onward].name}`, goTo: fixtureIn(cityId, 'travel') }
  }
  // Porto Lumina has no boss: what is next there is the final table.
  if (!status && cityId === 'portoLumina') {
    return { hud: 'the Legends Invitational, upstairs', goTo: fixtureIn(cityId, 'penthouse') }
  }
  return null
}

/** The first fixture of a kind in a town — its bus stop, its penthouse lift — as somewhere to go. */
function fixtureIn(cityId: CityId, kind: PoiAction['kind']): Destination | null {
  for (const [areaId, { area, cityId: town }] of Object.entries(AREAS)) {
    if (town !== cityId) continue
    const poi = area.pois.find((p) => p.action.kind === kind)
    if (poi) return { areaId, poiId: poi.id }
  }
  return null
}
