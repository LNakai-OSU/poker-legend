import { AREAS, CITIES, MISSIONS, TABLES, findItem } from '../world/content'
import { CHARACTERS } from '../world/characters'
import { CASINO_GOALS, goalOf } from '../world/goals'
import type { MissionGoal, TableDef } from '../world/types'
import { reputation, TOWN_ORDER, type CityId, type GameState } from './state'

/** Best dress-code level across everything the player owns. */
export function dressCodeLevel(state: GameState): number {
  return state.ownedItemIds.reduce((best, itemId) => {
    const effect = findItem(itemId)?.effect
    return effect?.kind === 'dressCode' ? Math.max(best, effect.level) : best
  }, 0)
}

/** Best travel discount across everything the player owns (0 = full price). */
export function travelDiscount(state: GameState): number {
  return state.ownedItemIds.reduce((best, itemId) => {
    const effect = findItem(itemId)?.effect
    if (effect?.kind === 'travelDiscount') return Math.max(best, effect.value)
    // A vehicle cuts the fare as well as saving the day.
    if (effect?.kind === 'fastTravel') return Math.max(best, effect.discount)
    return best
  }, 0)
}

/**
 * Whether anything owned lets you travel without losing a day.
 *
 * This is what a vehicle is actually for. Priced off the fare alone every vehicle
 * was a strictly losing purchase — the $90,000 sports car saved $2,250 on the
 * dearest route, so it repaid itself after forty trips in a game with about
 * twenty. Days are the scarce resource, because that is what debts come due on.
 */
export function hasFastTravel(state: GameState): boolean {
  return state.ownedItemIds.some((id) => findItem(id)?.effect?.kind === 'fastTravel')
}

/** What a meal is worth at the table. */
export const RESTED_TELL_CLARITY = 0.12

/**
 * Extra tell visibility, from things you own and from having eaten recently.
 *
 * Adds to what the Spotting Tells lesson gives, so a card protector and a hot
 * meal are small versions of the same help: fewer things taking your eyes off
 * the other players.
 */
export function tellClarity(state: GameState): number {
  const fromItems = state.ownedItemIds.reduce((sum, id) => {
    const effect = findItem(id)?.effect
    return effect?.kind === 'tellClarity' ? sum + effect.value : sum
  }, 0)
  const fromRest = state.day <= state.restedUntilDay ? RESTED_TELL_CLARITY : 0
  return fromItems + fromRest
}

/** How much a point of item reputation is worth against a club's door policy. */
const REPUTATION_PER_ITEM_POINT = 6

/** Reputation contributed by what you own and wear, on top of what you have done. */
export function itemReputation(state: GameState): number {
  return state.ownedItemIds.reduce((sum, id) => {
    const effect = findItem(id)?.effect
    return effect?.kind === 'reputation' ? sum + effect.value : sum
  }, 0)
}

/**
 * What the room thinks of you: what you have done, plus what you turned up in.
 * This is the number a club checks at the door.
 */
export function standing(state: GameState): number {
  return reputation(state) + itemReputation(state) * REPUTATION_PER_ITEM_POINT
}

export function travelCostTo(state: GameState, cityId: CityId): number {
  const city = CITIES[cityId]
  if (!city) return 0
  return Math.round(city.travelCost * (1 - travelDiscount(state)))
}

/**
 * The boss standing between you and a town: the previous town's, unless you have
 * already been here (a run that is past it never has to go back).
 */
export function bossBlocking(state: GameState, cityId: CityId): string | null {
  if (state.unlockedCityIds.includes(cityId)) return null
  const previous = TOWN_ORDER[TOWN_ORDER.indexOf(cityId) - 1]
  const goal = previous ? goalOf(previous) : undefined
  if (!goal || state.casino.bossBeaten.includes(goal.cityId)) return null
  return goal.bossId
}

/** Whether the private room off a town's casino is open to this player. */
export function privateRoomOpen(state: GameState, cityId: CityId): boolean {
  return state.casino.roomOpen.includes(cityId)
}

export interface GoalStatus {
  goal: (typeof CASINO_GOALS)[string]
  phase: 'win' | 'boss' | 'done'
  /** What to do next, in a sentence. */
  line: string
}

/**
 * Where the player stands on a town's casino goal: win enough on the floor, then
 * beat the boss in the private room, then the road to the next town is open.
 */
/** "the Riverboat", not "the The Riverboat". */
export const theCasino = (name: string) => (name.startsWith('The ') ? `the ${name.slice(4)}` : `the ${name}`)

export function goalStatus(state: GameState, cityId: CityId): GoalStatus | null {
  const goal = goalOf(cityId)
  if (!goal) return null
  const boss = CHARACTERS[goal.bossId]?.name ?? 'the boss'
  if (state.casino.bossBeaten.includes(cityId)) {
    return { goal, phase: 'done', line: `Beat ${boss}. The way to the next town is open.` }
  }
  if (state.casino.roomOpen.includes(cityId)) {
    return { goal, phase: 'boss', line: `Beat ${boss} one on one in the private room at ${theCasino(goal.casino)}.` }
  }
  const won = state.casino.net[cityId] ?? 0
  return {
    goal,
    phase: 'win',
    line: `Win $${goal.winTarget.toLocaleString()} at ${theCasino(goal.casino)} (${won < 0 ? '-' : ''}$${Math.abs(won).toLocaleString()} so far) to earn a game with ${boss}.`,
  }
}

/** The cheapest seat in each town: the lowest buy-in of its open tables (not the boss's, not a freeroll). */
function cheapestSeats(): Record<string, { tableId: string; buyIn: number }> {
  const best: Record<string, { tableId: string; buyIn: number }> = {}
  for (const { area, cityId } of Object.values(AREAS)) {
    for (const poi of area.pois) {
      if (poi.action.kind !== 'table') continue
      const table = TABLES[poi.action.tableId]
      if (!table || table.freeroll || table.bossOf || table.isFinale) continue
      if (!best[cityId] || table.buyIn < best[cityId].buyIn) best[cityId] = { tableId: table.id, buyIn: table.buyIn }
    }
  }
  return best
}

/**
 * The challenge in front of you in this town and what it asks of your roll, for
 * the Jobs page: what to do, the buy-in of the boss match against your cash, and,
 * when you cannot afford even the cheapest seat here, where to go.
 */
export function challengeLines(state: GameState): string[] {
  const status = goalStatus(state, state.cityId)
  // Porto Lumina has no boss: its challenge is the final table.
  if (!status && state.cityId !== 'portoLumina') return []
  const lines = [status ? status.line : 'Win the Poker Legends tournament, then the final table of the Invitational, and the penthouse is yours.']
  const seat = cheapestSeats()[state.cityId]
  if (seat && state.cash < seat.buyIn) {
    const here = CITIES[state.cityId]?.name ?? 'this town'
    const back = TOWN_ORDER[TOWN_ORDER.indexOf(state.cityId) - 1]
    const elsewhere = back ? `go back to the cheaper table in ${CITIES[back]?.name ?? 'the last town'}` : 'ask Marcus for his kitchen table'
    lines.push(`You are $${(seat.buyIn - state.cash).toLocaleString()} short of the cheapest seat in ${here} ($${seat.buyIn.toLocaleString()}). Take a job below, or ${elsewhere}.`)
  } else if (status && status.phase !== 'done') {
    const buyIn = TABLES[status.goal.tableId]?.buyIn
    if (buyIn !== undefined) {
      const gap = buyIn - state.cash
      lines.push(
        gap > 0
          ? `The boss match costs $${buyIn.toLocaleString()}. You have $${state.cash.toLocaleString()}: $${gap.toLocaleString()} short.`
          : `The boss match costs $${buyIn.toLocaleString()}. You have $${state.cash.toLocaleString()}.`,
      )
    }
  }
  return lines
}

/**
 * The Nadia file: what you have heard about why she wants a challenger, one
 * line per clue (docs/STORYBOARD.md §8). Empty until the first is heard.
 */
export const NADIA_CLUES: Array<{ flag: 'clueWatch' | 'clueRing' | 'clueRope' | 'clueTable' | 'clueConsortium' | 'clueScout'; line: string }> = [
  { flag: 'clueWatch', line: 'She came through Basin once and left her watch under Marcus’s sugar bowl.' },
  { flag: 'clueRing', line: 'Her first stack at Silver Creek was a ring, and a Mr. W paid for the third.' },
  { flag: 'clueRope', line: 'Everybody on the river owes somebody. She owes the biggest.' },
  { flag: 'clueTable', line: 'Hal taught her to read a room and she never learned to stop.' },
  { flag: 'clueConsortium', line: 'The Consortium pays the Invitational. Nobody has seen her spend it.' },
  { flag: 'clueScout', line: 'Dana was told to find somebody she cannot buy and cannot fix.' },
]

export function nadiaFile(state: GameState): string[] {
  const heard = NADIA_CLUES.filter((c) => state.flags[c.flag])
  if (heard.length === 0) return []
  return [`Nadia file: ${heard.length} of ${NADIA_CLUES.length}`, ...heard.map((c) => c.line)]
}

export interface TravelOption {
  cityId: CityId
  name: string
  blurb: string
  cost: number
  locked: boolean
  lockReason: string | null
}

export function travelOptions(state: GameState): TravelOption[] {
  return Object.values(CITIES)
    .filter((city) => city.id !== state.cityId)
    .map((city) => {
      const cost = travelCostTo(state, city.id)
      const visited = state.unlockedCityIds.includes(city.id)
      const bankrollShort = state.cash < city.unlockCash
      const cantAfford = state.cash < cost
      const bossName = bossBlocking(state, city.id)
      const locked = (!visited && bankrollShort) || cantAfford || bossName !== null
      let lockReason: string | null = null
      if (bossName !== null) {
        const goal = goalOf(TOWN_ORDER[TOWN_ORDER.indexOf(city.id) - 1])!
        lockReason = `Beat the boss of ${goal.casino} first`
      } else if (!visited && bankrollShort) lockReason = `Needs a bankroll of $${city.unlockCash.toLocaleString()}`
      else if (cantAfford) lockReason = `Travel costs $${cost.toLocaleString()}`
      return { cityId: city.id, name: city.name, blurb: city.blurb, cost, locked, lockReason }
    })
}

export interface TableAccess {
  allowed: boolean
  reason: string | null
  /** Set when the player can technically sit but is risking too much of their roll. */
  bankrollWarning: string | null
}

export function tableAccess(state: GameState, table: TableDef): TableAccess {
  if (table.bossOf && !privateRoomOpen(state, table.bossOf)) {
    return {
      allowed: false,
      reason: `The boss only plays people who have won $${(CASINO_GOALS[table.bossOf]?.winTarget ?? 0).toLocaleString()} on this floor.`,
      bankrollWarning: null,
    }
  }
  const dress = dressCodeLevel(state)
  if (table.dressCode && dress < table.dressCode) {
    return {
      allowed: false,
      reason: 'The room has a dress code, and you are not dressed for it.',
      bankrollWarning: null,
    }
  }
  if (table.tournament && state.flags.wonTournament) {
    return { allowed: false, reason: 'You have already won the floor. Your seat is at the Invitational.', bankrollWarning: null }
  }
  if (table.isFinale && !state.flags.wonTournament) {
    return {
      allowed: false,
      reason: 'The Invitational seats the winner of the Poker Legends tournament. Win the tournament first.',
      bankrollWarning: null,
    }
  }
  if (table.proof && state.cash < table.proof) {
    return {
      allowed: false,
      reason: `The Invitational wants proof of funds: $${table.proof.toLocaleString()} in the bank, not spent. You have $${state.cash.toLocaleString()}.`,
      bankrollWarning: null,
    }
  }
  if (!table.freeroll && state.cash < table.buyIn) {
    return {
      allowed: false,
      reason: `The buy-in is $${table.buyIn.toLocaleString()}. You have $${state.cash.toLocaleString()}.`,
      bankrollWarning: null,
    }
  }
  // Standard cash-game advice is ~20 buy-ins for the stake you sit in; the
  // mentor's bankroll lesson is what makes the game point this out.
  const hasLesson = state.lessonIds.includes('bankroll')
  const rollRatio = state.cash / table.buyIn
  const bankrollWarning =
    hasLesson && rollRatio < 5 && !table.tournament
      ? `This is ${rollRatio.toFixed(1)} buy-ins of your roll. Twenty is the usual advice.`
      : null
  return { allowed: true, reason: null, bankrollWarning }
}

export function isGoalMet(state: GameState, goal: MissionGoal): boolean {
  switch (goal.kind) {
    case 'handsWonTotal':
      return state.stats.handsWon >= goal.value
    case 'biggestPot':
      return state.stats.biggestPot >= goal.value
    case 'ownItem':
      return state.ownedItemIds.includes(goal.itemId)
    case 'hasLesson':
      return state.lessonIds.includes(goal.lessonId)
    case 'cash':
      return state.cash >= goal.value
  }
}

export type MissionStatus = 'unseen' | 'active' | 'ready' | 'done'

export function missionStatus(state: GameState, missionId: string): MissionStatus {
  if (state.completedMissionIds.includes(missionId)) return 'done'
  const mission = MISSIONS[missionId]
  const goalMet = mission !== undefined && isGoalMet(state, mission.goal)
  // A goal that is *already* met is ready whether or not the mission has been
  // briefed. Otherwise the Harbor Doorman tells a player in a tailored suit to
  // "come back in a real suit", because the brief is keyed on having talked to
  // him rather than on what the player is actually wearing.
  if (!state.acceptedMissionIds.includes(missionId)) return goalMet ? 'ready' : 'unseen'
  return goalMet ? 'ready' : 'active'
}

/** Which stake the player's roll actually supports, for the mentor's advice. */
export function recommendedStakeText(state: GameState): string {
  if (state.cash < 2000) return 'Silver Creek or Riverbend money.'
  if (state.cash < 20000) return 'Crescent Harbor money.'
  if (state.cash < 200000) return 'Palm Cay or Neon Mesa money.'
  return 'Porto Lumina money.'
}
