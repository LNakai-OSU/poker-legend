export type CityId =
  | 'apartment'
  | 'silverCreek'
  | 'riverbend'
  | 'crescentHarbor'
  | 'palmCay'
  | 'neonMesa'
  | 'portoLumina'

export interface Debt {
  id: string
  sponsorId: string
  sponsorName: string
  /** What you were staked. */
  principal: number
  /** Principal plus the sponsor's cut — what you actually have to hand back. */
  owed: number
  dueOnDay: number
  cityId: CityId
}

export interface GameState {
  day: number
  cash: number
  cityId: CityId
  /** Which space inside the city you're in — a street, a casino floor, a shop. */
  areaId: string | null
  unlockedCityIds: CityId[]
  ownedItemIds: string[]
  completedMissionIds: string[]
  acceptedMissionIds: string[]
  lessonIds: string[]
  /** Invite-only tables opened up by working the room at clubs and parties. */
  unlockedTableIds: string[]
  debts: Debt[]
  /** Set when a debt goes past due: collectors are hunting you in this city. */
  huntedInCityId: CityId | null
  /** Skipping town buys you until this day before they pick the trail back up. */
  huntGraceUntilDay: number
  /**
   * The last day a meal is still doing you any good. Eating is the only thing in
   * the town that used to change nothing at all.
   */
  restedUntilDay: number
  /**
   * The day Nadia will sit down for the heads-up match again. Losing it sets
   * this into the future: the match is one bet for the whole buy-in, and if
   * losing could be retried immediately it would just be an expensive cash game.
   */
  finaleRematchDay: number
  flags: {
    wonPokerNight: boolean
    beatFinalRival: boolean
    hasPenthouse: boolean
  }
  stats: {
    handsWon: number
    biggestPot: number
    tablesPlayed: number
  }
}

export function initialState(): GameState {
  return {
    day: 1,
    cash: 0,
    cityId: 'apartment',
    areaId: null,
    unlockedCityIds: ['apartment'],
    ownedItemIds: [],
    completedMissionIds: [],
    acceptedMissionIds: [],
    lessonIds: [],
    unlockedTableIds: [],
    debts: [],
    huntedInCityId: null,
    huntGraceUntilDay: 0,
    restedUntilDay: 0,
    finaleRematchDay: 0,
    flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false },
    stats: { handsWon: 0, biggestPot: 0, tablesPlayed: 0 },
  }
}

export function totalOwed(state: GameState): number {
  return state.debts.reduce((sum, debt) => sum + debt.owed, 0)
}

export function overdueDebts(state: GameState): Debt[] {
  return state.debts.filter((debt) => state.day > debt.dueOnDay)
}

/** Days remaining before the soonest debt comes due (null when debt-free). */
export function daysUntilDue(state: GameState): number | null {
  if (state.debts.length === 0) return null
  return Math.min(...state.debts.map((debt) => debt.dueOnDay - state.day))
}

/**
 * Advancing a day is what makes debt dangerous: a session at the table or a
 * trip between cities burns time, and once a debt is past due the sponsor's
 * collectors start hunting you wherever you are.
 */
export function advanceDay(state: GameState, days = 1): GameState {
  const next = { ...state, day: state.day + days }
  const stillInGrace = next.day <= next.huntGraceUntilDay
  if (overdueDebts(next).length > 0 && next.huntedInCityId === null && !stillInGrace) {
    return { ...next, huntedInCityId: next.cityId }
  }
  return next
}

export function payDebt(state: GameState, debtId: string): GameState {
  const debt = state.debts.find((d) => d.id === debtId)
  if (!debt || state.cash < debt.owed) return state
  const debts = state.debts.filter((d) => d.id !== debtId)
  const stillOverdue = debts.some((d) => state.day > d.dueOnDay)
  return {
    ...state,
    cash: state.cash - debt.owed,
    debts,
    huntedInCityId: stillOverdue ? state.huntedInCityId : null,
  }
}

/** Days of breathing room after a shakedown before the collectors resume the hunt. */
export const CAUGHT_GRACE_DAYS = 3

/**
 * The share of the bankroll a shakedown costs. Taking all of it was a mugging
 * rather than a mechanic: the run was over on the spot, with nothing left to
 * rebuy a table with and the debt still standing. Three quarters hurts badly
 * enough to be worth running from while leaving something to play out of.
 */
export const CAUGHT_CASH_LOSS_FRACTION = 0.75

/**
 * Collectors catch up with you. They take most of the bankroll you are carrying
 * and the debt stays exactly where it was: wiping the slate used to make walking
 * into them strictly better than paying, which is the opposite of the intended
 * pressure. They also leave you alone for a few days afterwards, so being shaken
 * down is a hole you can dig out of rather than a dead end.
 */
export function caughtByCollectors(state: GameState): GameState {
  return {
    ...state,
    cash: state.cash - Math.round(state.cash * CAUGHT_CASH_LOSS_FRACTION),
    huntedInCityId: null,
    huntGraceUntilDay: state.day + CAUGHT_GRACE_DAYS,
  }
}

/** How long Nadia makes you wait before she will put the match up again. */
export const FINALE_REMATCH_DAYS = 7

/**
 * Losing the heads-up match. The buy-in is already gone — it left the wallet
 * when you sat down and it is on her side of the table now — and this is the
 * other half of the cost: she will not re-rack for you the same night, so the
 * match is a commitment rather than a button you can keep pressing.
 */
export function lostFinalChallenge(state: GameState): GameState {
  return { ...state, finaleRematchDay: state.day + FINALE_REMATCH_DAYS }
}

/** Days still to wait before a rematch, or 0 when she will play you now. */
export function daysUntilRematch(state: GameState): number {
  return Math.max(0, state.finaleRematchDay - state.day)
}

export function takeStake(
  state: GameState,
  sponsor: { id: string; name: string },
  principal: number,
  interestRate: number,
  dueInDays: number,
): GameState {
  const debt: Debt = {
    id: `${sponsor.id}-${state.day}-${state.debts.length}`,
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    principal,
    owed: Math.round(principal * (1 + interestRate)),
    dueOnDay: state.day + dueInDays,
    cityId: state.cityId,
  }
  return { ...state, cash: state.cash + principal, debts: [...state.debts, debt] }
}

/**
 * Skipping town shakes whoever is looking for you, but only until the next day
 * rolls over — enough breathing room to play a session or find the money.
 */
export function travelTo(
  state: GameState,
  cityId: CityId,
  options: { keepDay?: boolean; areaId?: string } = {},
): GameState {
  const unlocked = state.unlockedCityIds.includes(cityId)
    ? state.unlockedCityIds
    : [...state.unlockedCityIds, cityId]
  const moved = {
    ...state,
    cityId,
    // Where the bus stops. Null falls back to wherever the town begins, which is
    // only right for towns whose first area is a street.
    areaId: options.areaId ?? null,
    unlockedCityIds: unlocked,
    huntedInCityId: null,
  }
  // Driving yourself does not cost you a day on the road. That — rather than a
  // few dollars off the fare — is what makes a vehicle worth its price, because
  // debts come due on a day count. The caller decides, since working out what the
  // player owns needs the content tables and this module stays free of them.
  const next = options.keepDay ? moved : advanceDay(moved)
  return { ...next, huntedInCityId: null, huntGraceUntilDay: next.day }
}


export function unlockTable(state: GameState, tableId: string): GameState {
  if (state.unlockedTableIds.includes(tableId)) return state
  return { ...state, unlockedTableIds: [...state.unlockedTableIds, tableId] }
}

/**
 * How seriously the room takes you. Parties and private games open up once
 * you've actually done something, rather than on a plain cash threshold.
 */
export function reputation(state: GameState): number {
  return (
    state.stats.handsWon +
    state.stats.tablesPlayed * 3 +
    Math.floor(state.stats.biggestPot / 250) +
    state.lessonIds.length * 4
  )
}

export function unlockCity(state: GameState, cityId: CityId): GameState {
  if (state.unlockedCityIds.includes(cityId)) return state
  return { ...state, unlockedCityIds: [...state.unlockedCityIds, cityId] }
}
