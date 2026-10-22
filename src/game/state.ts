import { periodAfter, type TimePeriod } from './time'

/**
 * Something true about the world that content can ask about.
 *
 * Named rather than free-form strings so a typo in an event is a type error
 * instead of a condition that is quietly never satisfied.
 */
export type StoryFlag = 'wonPokerNight' | 'beatFinalRival' | 'hasPenthouse' | 'cameBack'

export type CityId =
  | 'apartment'
  | 'silverCreek'
  | 'riverbend'
  | 'crescentHarbor'
  | 'palmCay'
  | 'neonMesa'
  | 'portoLumina'

/**
 * Every town, from home to the top of the ladder.
 *
 * The order the story is told in, which is why it lives with the state rather
 * than with the maps: a beat that asks how far the run has got needs it, and
 * the maps should not have to be loaded to answer. `CITY_ORDER` in `cities.ts`
 * is this list without home, and a content test holds the two together.
 */
export const TOWN_ORDER: CityId[] = [
  'apartment',
  'silverCreek',
  'riverbend',
  'crescentHarbor',
  'palmCay',
  'neonMesa',
  'portoLumina',
]

/**
 * How far up the ladder the run has got: the furthest town the player has set
 * foot in, by bus or on foot.
 *
 * This is the story's clock. Characters move town to town by it and beats ask
 * for it, so going back down the ladder does not rewind anything — Ray is
 * still at Silver Creek, but the people who followed you up have moved on.
 */
export function chapterOf(state: Pick<GameState, 'unlockedCityIds'>): CityId {
  let furthest = 0
  for (const cityId of state.unlockedCityIds) {
    furthest = Math.max(furthest, TOWN_ORDER.indexOf(cityId))
  }
  return TOWN_ORDER[furthest]
}

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
  /** Set the first time the clock passes `dueOnDay`, so a missed stake is counted once. */
  missed?: boolean
}

/** What has happened between you and one sponsor. Kept after the debt is gone. */
export interface SponsorRecord {
  staked: number
  repaid: number
  /** Stakes that ran past their day. */
  missed: number
  /** Times their collectors caught up with you. */
  caught: number
}

/**
 * The story's memory of losing.
 *
 * A debt used to vanish from the state the moment it was paid, and nothing at all
 * remembered a bust, a shakedown or a lost match — so nobody in the world could
 * say anything about them. The mechanics count these as they happen and beats
 * read them through the `count` condition.
 */
export interface RunRecord {
  /** Times the bankroll fell below the cheapest seat on the ladder (`BUST_LINE`). */
  busted: number
  /** Heads-up matches lost to Nadia. */
  challengeLost: number
  /** By sponsor id. */
  sponsors: Record<string, SponsorRecord>
}

export type CountOf = 'busted' | 'challengeLost' | keyof SponsorRecord

/**
 * Below this you cannot sit at any table on the ladder: the buy-in at Silver
 * Creek's low-stakes game. A content test holds it to the cheapest table.
 */
export const BUST_LINE = 100

export interface GameState {
  day: number
  /**
   * What time of day it is.
   *
   * Deliberately *not* what the poker economy is denominated in. Days are the
   * scarce resource — debts come due on a day count, and a session at a table
   * costs one — and slicing a day into four would have quadrupled how many
   * sessions fit before a debt landed. The period moves on the things that cost
   * no days at all: a local bus ride, a meal, an hour spent walking. It buys you
   * somewhere to be rather than more time to play.
   */
  period: TimePeriod
  cash: number
  cityId: CityId
  /** Which space inside the city you're in — a street, a casino floor, a shop. */
  areaId: string | null
  /**
   * Towns the player has been to, by bus or on foot. The bus will always take
   * you back to one of these, and the furthest of them is the story's chapter
   * (see `chapterOf`).
   */
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
  flags: Record<StoryFlag, boolean>
  /**
   * Scripted beats that have already happened.
   *
   * Kept apart from `flags` because they answer different questions: a flag is
   * something true about the world that content can ask about, and this is a
   * record of what the player has already been shown. An event that fires every
   * time you walk back through a door is the commonest way a system like this
   * goes wrong, and this is what stops it.
   */
  completedEventIds: string[]
  record: RunRecord
  stats: {
    handsWon: number
    biggestPot: number
    tablesPlayed: number
  }
}

export function initialState(): GameState {
  return {
    day: 1,
    period: 'morning',
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
    flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false, cameBack: false },
    completedEventIds: [],
    record: emptyRecord(),
    stats: { handsWon: 0, biggestPot: 0, tablesPlayed: 0 },
  }
}

export function emptyRecord(): RunRecord {
  return { busted: 0, challengeLost: 0, sponsors: {} }
}

const NO_SPONSOR_RECORD: SponsorRecord = { staked: 0, repaid: 0, missed: 0, caught: 0 }

/** Adds one to something the run remembers about a sponsor. */
function bumpSponsor(record: RunRecord, sponsorId: string, what: keyof SponsorRecord): RunRecord {
  const before = record.sponsors[sponsorId] ?? NO_SPONSOR_RECORD
  return { ...record, sponsors: { ...record.sponsors, [sponsorId]: { ...before, [what]: before[what] + 1 } } }
}

/**
 * How many times something has happened: a bust, a lost match, or — for one
 * sponsor, or all of them when none is named — a stake taken, repaid, missed or
 * collected on.
 */
export function countOf(state: GameState, of: CountOf, sponsorId?: string): number {
  if (of === 'busted' || of === 'challengeLost') return state.record[of]
  if (sponsorId) return (state.record.sponsors[sponsorId] ?? NO_SPONSOR_RECORD)[of]
  return Object.values(state.record.sponsors).reduce((sum, r) => sum + r[of], 0)
}

/** A session, a shakedown or a bad night at the slots that left you unable to sit anywhere. */
export function recordBust(state: GameState): GameState {
  return { ...state, record: { ...state.record, busted: state.record.busted + 1 } }
}

/**
 * Where you stand with a sponsor, or with all of them when none is named:
 * owing nothing, owing on time, or past due. One sponsor never has two stakes
 * out at once, so for one sponsor these are the only three answers.
 */
export type DebtStatus = 'none' | 'owing' | 'overdue'

export function debtStatus(state: GameState, sponsorId?: string): DebtStatus {
  const debts = sponsorId ? state.debts.filter((d) => d.sponsorId === sponsorId) : state.debts
  if (debts.length === 0) return 'none'
  return debts.some((d) => state.day > d.dueOnDay) ? 'overdue' : 'owing'
}

/** Whether collectors are working the town you are standing in. */
export function isHunted(state: GameState): boolean {
  return state.huntedInCityId !== null && state.huntedInCityId === state.cityId
}

/**
 * Whose collectors they are: the sponsor whose stake ran out first. One face
 * per hunt — several sponsors past due do not send a crowd.
 */
export function huntingSponsorId(state: GameState): string | null {
  const overdue = overdueDebts(state)
  if (overdue.length === 0) return null
  return overdue.reduce((first, d) => (d.dueOnDay < first.dueOnDay ? d : first)).sponsorId
}

/**
 * Where the run stands with the heads-up match: never lost, lost and waiting
 * out the week she makes you wait, lost and she will play you again now, or won.
 */
export type ChallengeStatus = 'unplayed' | 'lost' | 'rematch' | 'won'

export function challengeStatus(state: GameState): ChallengeStatus {
  if (state.flags.hasPenthouse) return 'won'
  if (state.record.challengeLost === 0) return 'unplayed'
  return daysUntilRematch(state) > 0 ? 'lost' : 'rematch'
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
  // You come out of a session or a long drive at the start of the next day, not
  // at the hour you went into it.
  return atTime(state, state.day + days, 'morning')
}

/**
 * Puts the clock somewhere and lets the collectors catch up.
 *
 * Both ways time passes come through here, because the check that matters is
 * about the date and not about which of them moved it: a debt that came due
 * while you were walking around town is just as overdue as one that came due
 * while you were at a table.
 */
function atTime(state: GameState, day: number, period: TimePeriod): GameState {
  const next = markMissed({ ...state, day, period })
  const stillInGrace = next.day <= next.huntGraceUntilDay
  if (overdueDebts(next).length > 0 && next.huntedInCityId === null && !stillInGrace) {
    return { ...next, huntedInCityId: next.cityId }
  }
  return next
}

/** A stake that has just run past its day is a stake missed, and the sponsor remembers. */
function markMissed(state: GameState): GameState {
  const newly = state.debts.filter((d) => !d.missed && state.day > d.dueOnDay)
  if (newly.length === 0) return state
  return {
    ...state,
    debts: state.debts.map((d) => (newly.includes(d) ? { ...d, missed: true } : d)),
    record: newly.reduce((record, d) => bumpSponsor(record, d.sponsorId, 'missed'), state.record),
  }
}

/**
 * Moves the clock on without spending a day.
 *
 * This is what a bus ride across town or an hour over a meal costs. Rolling past
 * night hands over to `advanceDay`, so going to bed late still puts the
 * collectors on you if a debt came due while you were out.
 */
export function advancePeriod(state: GameState, steps = 1): GameState {
  const { period, daysPassed } = periodAfter(state.period, steps)
  return atTime(state, state.day + daysPassed, period)
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
    record: bumpSponsor(state.record, debt.sponsorId, 'repaid'),
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
  const cash = state.cash - Math.round(state.cash * CAUGHT_CASH_LOSS_FRACTION)
  const hunter = huntingSponsorId(state)
  const caught = {
    ...state,
    cash,
    huntedInCityId: null,
    huntGraceUntilDay: state.day + CAUGHT_GRACE_DAYS,
    record: hunter ? bumpSponsor(state.record, hunter, 'caught') : state.record,
  }
  // Shaken down below the cheapest seat is a bust like any other.
  return state.cash >= BUST_LINE && cash < BUST_LINE ? recordBust(caught) : caught
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
  return {
    ...state,
    finaleRematchDay: state.day + FINALE_REMATCH_DAYS,
    record: { ...state.record, challengeLost: state.record.challengeLost + 1 },
  }
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
  return {
    ...state,
    cash: state.cash + principal,
    debts: [...state.debts, debt],
    record: bumpSponsor(state.record, sponsor.id, 'staked'),
  }
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

/**
 * Walking into an area, or being put in one by a scene.
 *
 * The town counts as visited however you got there. Only the bus used to mark
 * it, so a player who walked the road to Riverbend was, as far as the story
 * could tell, still in Silver Creek — and the people who follow you up the
 * ladder never followed.
 */
export function arriveAt(state: GameState, areaId: string, cityId: CityId): GameState {
  return unlockCity({ ...state, areaId, cityId }, cityId)
}

export function unlockCity(state: GameState, cityId: CityId): GameState {
  if (state.unlockedCityIds.includes(cityId)) return state
  return { ...state, unlockedCityIds: [...state.unlockedCityIds, cityId] }
}
