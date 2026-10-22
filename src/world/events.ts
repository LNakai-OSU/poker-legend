import type { TimePeriod } from '../game/time'
import {
  challengeStatus,
  chapterOf,
  countOf,
  debtStatus,
  huntingSponsorId,
  isHunted,
  type ChallengeStatus,
  type CityId,
  type CountOf,
  type DebtStatus,
  type GameState,
  type StoryFlag,
} from '../game/state'

/**
 * Scripted moments, written as data.
 *
 * A story beat used to be code. "At the end of the first poker night the player
 * ends up back at Marcus's house" meant a branch in a view switch, a flag read
 * in three files, and a scene component — so every change to the story was a
 * change to the program, and the story could only be read by reading the
 * program.
 *
 * An event says when it happens, what has to be true, and what then occurs. The
 * runner knows how to do each of those things; the content says which ones, in
 * what order. Adding a character who stops you in the street, says two lines and
 * hands you something is now a dozen lines of content and no code at all.
 */

/** What makes an event fire. */
export type EventTrigger =
  /** Walking into an area, however you got there. */
  | { kind: 'enterArea'; areaId: string }
  /** Standing on one specific tile of one area. */
  | { kind: 'standOn'; areaId: string; col: number; row: number }
  /** Talking to a scheduled character, by their character id. */
  | { kind: 'talkTo'; characterId: string }
  /** Talking to a fixture on the map, by its POI id. */
  | { kind: 'interact'; poiId: string }
  /**
   * The collectors catch you. The beat plays with them standing over you, and
   * the shakedown follows its last line; `hunted` says whose they are.
   */
  | { kind: 'caught' }

/** What has to be true for it to fire. All of them must hold. */
export type EventCondition =
  | { kind: 'flag'; flag: StoryFlag; set?: boolean }
  | { kind: 'period'; period: TimePeriod | TimePeriod[] }
  | { kind: 'dayAtLeast'; day: number }
  | { kind: 'cashAtLeast'; amount: number }
  | { kind: 'hasItem'; itemId: string }
  | { kind: 'hasLesson'; lessonId: string }
  | { kind: 'eventDone'; eventId: string; done?: boolean }
  /**
   * How far up the ladder the run has got: the furthest town set foot in (see
   * `chapterOf`). One town, or any of several. This is what moves the cast from
   * town to town and keeps each town's beats in its own part of the story.
   */
  | { kind: 'chapter'; cityId: CityId | CityId[] }
  /** Holding less than this: broke, or too short for the room you are in. */
  | { kind: 'cashBelow'; amount: number }
  /**
   * Where you stand with a sponsor — or with every sponsor, when none is named:
   * `none` (owe nothing), `owing` (on time) or `overdue` (the stake was missed).
   */
  | { kind: 'debt'; sponsorId?: string; status: DebtStatus | DebtStatus[] }
  /** Collectors are working this town — anybody's, or one sponsor's. */
  | { kind: 'hunted'; sponsorId?: string; set?: boolean }
  /**
   * The heads-up match: `unplayed`, `lost` (she has made you wait), `rematch`
   * (lost, and she will play you again now) or `won`.
   */
  | { kind: 'challenge'; status: ChallengeStatus | ChallengeStatus[] }
  /**
   * How often something has happened over the run: `busted`, `challengeLost`,
   * or a sponsor's `staked`, `repaid`, `missed` and `caught` (one sponsor's, or
   * everybody's). At least once unless `atLeast`/`atMost` say otherwise;
   * `atMost: 0` is "never".
   */
  | { kind: 'count'; of: CountOf; sponsorId?: string; atLeast?: number; atMost?: number }

/**
 * What happens, in order.
 *
 * Deliberately a small vocabulary. Every action here is something the game can
 * already do — the point is to be able to order them from content rather than to
 * grow a scripting language nobody can keep in their head.
 */
export type EventAction =
  /** A text box. `speaker` is a character id, or a plain name, or nothing. */
  | { kind: 'dialogue'; speaker?: string; lines: string[] }
  /** Move somebody who is standing in this area to another tile. */
  | { kind: 'moveNpc'; characterId: string; col: number; row: number }
  | { kind: 'wait'; ms: number }
  | { kind: 'setFlag'; flag: StoryFlag }
  | { kind: 'clearFlag'; flag: StoryFlag }
  | { kind: 'giveItem'; itemId: string }
  /** Negative takes it away; the wallet never goes below nothing. */
  | { kind: 'giveCash'; amount: number }
  | { kind: 'unlockCity'; cityId: string }
  | { kind: 'unlockTable'; tableId: string }
  | { kind: 'startTable'; tableId: string }
  | { kind: 'startPokerNight' }
  /** Put the player somewhere, with no bus and no door. */
  | { kind: 'teleport'; areaId: string; col: number; row: number }
  | { kind: 'advancePeriod'; steps?: number }
  | { kind: 'advanceDay'; days?: number }
  | { kind: 'playSound'; sound: string }
  | { kind: 'fade'; to: 'out' | 'in' }

export interface GameEvent {
  id: string
  /** A sentence for whoever reads this later, including me. */
  about: string
  trigger: EventTrigger
  conditions?: EventCondition[]
  /**
   * Fires once ever, then never again. The default, because a scripted beat that
   * repeats every time you walk back through the door is the single most common
   * way this kind of system goes wrong.
   */
  repeatable?: boolean
  actions: EventAction[]
}

/** Whether one condition holds right now. */
export function conditionHolds(condition: EventCondition, state: GameState): boolean {
  switch (condition.kind) {
    case 'flag':
      return state.flags[condition.flag] === (condition.set ?? true)
    case 'period':
      return Array.isArray(condition.period)
        ? condition.period.includes(state.period)
        : state.period === condition.period
    case 'dayAtLeast':
      return state.day >= condition.day
    case 'cashAtLeast':
      return state.cash >= condition.amount
    case 'hasItem':
      return state.ownedItemIds.includes(condition.itemId)
    case 'hasLesson':
      return state.lessonIds.includes(condition.lessonId)
    case 'eventDone':
      return state.completedEventIds.includes(condition.eventId) === (condition.done ?? true)
    case 'chapter': {
      const chapter = chapterOf(state)
      return Array.isArray(condition.cityId) ? condition.cityId.includes(chapter) : condition.cityId === chapter
    }
    case 'cashBelow':
      return state.cash < condition.amount
    case 'debt':
      return [condition.status].flat().includes(debtStatus(state, condition.sponsorId))
    case 'hunted': {
      const hunted = isHunted(state) && (!condition.sponsorId || huntingSponsorId(state) === condition.sponsorId)
      return hunted === (condition.set ?? true)
    }
    case 'challenge':
      return [condition.status].flat().includes(challengeStatus(state))
    case 'count': {
      const [low, high] = countRange(condition)
      const n = countOf(state, condition.of, condition.sponsorId)
      return n >= low && n <= high
    }
  }
}

/** The counts a `count` condition accepts, inclusive. Just `of` means at least once. */
function countRange(condition: Extract<EventCondition, { kind: 'count' }>): [number, number] {
  const low = condition.atLeast ?? (condition.atMost === undefined ? 1 : 0)
  return [low, condition.atMost ?? Infinity]
}

/** Whether every one of these holds. No conditions at all always holds. */
export function allHold(conditions: EventCondition[] | undefined, state: GameState): boolean {
  return (conditions ?? []).every((condition) => conditionHolds(condition, state))
}

/**
 * Whether two events could ever be ready to fire at the same moment.
 *
 * Two events on one trigger must be told apart by their conditions, or which
 * one fires is decided by declaration order — which is not a decision anybody
 * made. This only has to understand the conditions actually used to separate
 * rivals, and anything it cannot prove apart counts as a clash, so it errs
 * toward complaining:
 *
 * - a flag one needs set and the other needs clear;
 * - hours, or chapters, that do not overlap;
 * - an earlier beat one needs done and the other needs not done;
 * - one waiting on the other, which only fires once — the commonest way to
 *   give a character a second thing to say;
 * - cash at least one amount and below another; where the match stands; owing
 *   a sponsor and not; whose collectors are in town; counts that do not meet.
 *
 * Shared by the content tests and the editor, so they cannot disagree.
 */
export function canBothFire(a: GameEvent, b: GameEvent): boolean {
  const ca = a.conditions ?? []
  const cb = b.conditions ?? []

  const flags = (cs: EventCondition[]) =>
    new Map(cs.flatMap((c) => (c.kind === 'flag' ? [[c.flag, c.set ?? true] as const] : [])))
  const flagsB = flags(cb)
  for (const [flag, want] of flags(ca)) {
    if (flagsB.has(flag) && flagsB.get(flag) !== want) return false
  }

  const done = (cs: EventCondition[]) =>
    new Map(cs.flatMap((c) => (c.kind === 'eventDone' ? [[c.eventId, c.done ?? true] as const] : [])))
  const doneA = done(ca)
  const doneB = done(cb)
  for (const [eventId, want] of doneA) {
    if (doneB.has(eventId) && doneB.get(eventId) !== want) return false
  }
  if (!b.repeatable && doneA.get(b.id) === true) return false
  if (!a.repeatable && doneB.get(a.id) === true) return false

  const overlap = <T>(pick: (c: EventCondition) => T | T[] | undefined) => {
    const of = (cs: EventCondition[]) => {
      for (const c of cs) {
        const value = pick(c)
        if (value !== undefined) return new Set(Array.isArray(value) ? value : [value])
      }
      return null
    }
    const sa = of(ca)
    const sb = of(cb)
    return !sa || !sb || [...sa].some((value) => sb.has(value))
  }
  if (!overlap((c) => (c.kind === 'period' ? c.period : undefined))) return false
  if (!overlap((c) => (c.kind === 'chapter' ? c.cityId : undefined))) return false

  // Cash: at least one amount and below another cannot both hold.
  const [loA, hiA] = cashRange(ca)
  const [loB, hiB] = cashRange(cb)
  if (loA >= hiB || loB >= hiA) return false

  // The match: an explicit status, narrowed by whether the penthouse is yours.
  const statusesA = challengeStatuses(ca)
  const statusesB = challengeStatuses(cb)
  if (![...statusesA].some((s) => statusesB.has(s))) return false

  if (!debtsCanAgree(ca, cb)) return false
  if (!huntsCanAgree(ca, cb)) return false

  // The same count, in ranges that do not meet.
  for (const x of ca) {
    if (x.kind !== 'count') continue
    for (const y of cb) {
      if (y.kind !== 'count' || y.of !== x.of || y.sponsorId !== x.sponsorId) continue
      const [lx, hx] = countRange(x)
      const [ly, hy] = countRange(y)
      if (lx > hy || ly > hx) return false
    }
  }

  return true
}

/** The cash an event's conditions allow, as [at least, below). */
function cashRange(cs: EventCondition[]): [number, number] {
  let low = 0
  let high = Infinity
  for (const c of cs) {
    if (c.kind === 'cashAtLeast') low = Math.max(low, c.amount)
    if (c.kind === 'cashBelow') high = Math.min(high, c.amount)
  }
  return [low, high]
}

const ALL_CHALLENGE: ChallengeStatus[] = ['unplayed', 'lost', 'rematch', 'won']

/** Where the match can stand for these conditions to hold. The penthouse is the match won. */
function challengeStatuses(cs: EventCondition[]): Set<ChallengeStatus> {
  let allowed = new Set(ALL_CHALLENGE)
  for (const c of cs) {
    if (c.kind === 'challenge') allowed = new Set([c.status].flat().filter((s) => allowed.has(s)))
    if (c.kind === 'flag' && c.flag === 'hasPenthouse') {
      const won = c.set ?? true
      allowed = new Set([...allowed].filter((s) => (s === 'won') === won))
    }
  }
  return allowed
}

/**
 * Whether two sets of debt conditions could hold at once. Statuses for the same
 * sponsor (or both for everyone) must share one; owing nobody anything rules out
 * owing anybody, and nobody being overdue rules out any one sponsor being.
 */
function debtsCanAgree(ca: EventCondition[], cb: EventCondition[]): boolean {
  const of = (cs: EventCondition[]) =>
    cs.flatMap((c) => (c.kind === 'debt' ? [{ sponsor: c.sponsorId ?? null, status: [c.status].flat() }] : []))
  // What one sponsor's status allows of everyone's, and the other way round.
  const fits = (all: DebtStatus, one: DebtStatus) =>
    all === 'overdue' || (all === 'owing' ? one !== 'overdue' : one === 'none')
  for (const x of of(ca)) {
    for (const y of of(cb)) {
      if (x.sponsor === y.sponsor) {
        if (!x.status.some((s) => y.status.includes(s))) return false
      } else if (x.sponsor === null || y.sponsor === null) {
        const [all, one] = x.sponsor === null ? [x, y] : [y, x]
        if (!all.status.some((a) => one.status.some((o) => fits(a, o)))) return false
      }
    }
  }
  return true
}

/** One hunt at a time, by one sponsor's people: hunted and not, or by two different sponsors, cannot both hold. */
function huntsCanAgree(ca: EventCondition[], cb: EventCondition[]): boolean {
  const of = (cs: EventCondition[]) =>
    cs.flatMap((c) => (c.kind === 'hunted' ? [{ sponsor: c.sponsorId ?? null, set: c.set ?? true }] : []))
  for (const x of of(ca)) {
    for (const y of of(cb)) {
      if (x.set && y.set && x.sponsor && y.sponsor && x.sponsor !== y.sponsor) return false
      if (x.set !== y.set) {
        const [yes, no] = x.set ? [x, y] : [y, x]
        // Not hunted at all rules out hunted by anybody; not hunted by X rules out hunted by X.
        if (no.sponsor === null || no.sponsor === yes.sponsor) return false
      }
    }
  }
  return true
}

/** Whether the same trigger is being described twice. */
function sameTrigger(a: EventTrigger, b: EventTrigger): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'enterArea':
      return b.kind === 'enterArea' && a.areaId === b.areaId
    case 'standOn':
      return b.kind === 'standOn' && a.areaId === b.areaId && a.col === b.col && a.row === b.row
    case 'talkTo':
      return b.kind === 'talkTo' && a.characterId === b.characterId
    case 'interact':
      return b.kind === 'interact' && a.poiId === b.poiId
    case 'caught':
      return b.kind === 'caught'
  }
}

/**
 * The event this trigger fires, if any.
 *
 * At most one. Two events competing for the same moment is a content bug rather
 * than a feature — `content.test.ts` fails on a pair that could both fire — so
 * taking the first in declaration order is a tie-break that should never be
 * needed, not a priority system.
 */
export function eventFor(
  events: GameEvent[],
  trigger: EventTrigger,
  state: GameState,
): GameEvent | undefined {
  return events.find((event) => {
    if (!sameTrigger(event.trigger, trigger)) return false
    if (!event.repeatable && state.completedEventIds.includes(event.id)) return false
    return allHold(event.conditions, state)
  })
}

/** Every event that could fire on a trigger, ignoring whether it has already. */
export function eventsSharing(events: GameEvent[], trigger: EventTrigger): GameEvent[] {
  return events.filter((event) => sameTrigger(event.trigger, trigger))
}

/**
 * Every scripted beat in the game.
 *
 * Ordered roughly as the player meets them. An event fires on its trigger when
 * its conditions hold, and — unless it says otherwise — never again.
 */
export const EVENTS: GameEvent[] = [
  {
    id: 'poker-night',
    about:
      "Marcus's Friday game: the one that starts the campaign. Used to be a POI " +
      'with its own action kind and a flag read in three files.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      // He is only at his place from the afternoon on, so this is really asking
      // "are we at his house" — but saying the hour out loud means the game
      // reads as a Friday night rather than a thing available at breakfast.
      { kind: 'period', period: ['afternoon', 'evening', 'night'] },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: You made it! Sit down, sit down.',
          'Marcus: Everything on the table, winner takes the lot. That is the rule.',
          'Marcus: You in?',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'marcus-reminds-you',
    about: 'Catching Marcus out on Basin Street before the game, so the night has a cause.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'period', period: 'morning' },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Tonight. My place. You know where it is.',
          'Marcus: I will be home from the afternoon. Come when you like.',
          'Marcus: Bring money. That is the only part that matters.',
        ],
      },
    ],
  },
  {
    id: 'dana-takes-your-measure',
    about:
      'Dana has been watching you play. Costs nothing and gives nothing — she is ' +
      'here to make the town feel like somewhere you are known.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'apartment' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: You took Marcus.',
          'Dana: He will tell it like he was unlucky. He was not unlucky.',
          'Dana: Go and lose it somewhere bigger. That is what everyone does.',
          'Dana: I will be around.',
        ],
      },
    ],
  },
  {
    id: 'marcus-sends-you-off',
    about:
      'The casino nudge. Marcus, cleaned out and proud, sends you to Silver Creek — ' +
      'and plants the penthouse as the thing at the top of the ladder.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'apartment' },
      // Always true straight after his game; it keeps this apart from the
      // kitchen table he deals again if you are ever broke.
      { kind: 'cashAtLeast', amount: 100 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Everything I had, and everything Dana had. I am weirdly proud of you.',
          'Marcus: Do not stay here. The 14 runs out to Silver Creek. Real table, small money.',
          'Marcus: You know the Porto Lumina story? A woman lives in a penthouse over the casino.',
          'Marcus: Every so often she puts it on the table, heads up. Four years, and nobody has taken it.',
          'Marcus: Your rent is covered till you are back. Do not argue. It goes on your tab.',
          'Marcus: Go and be a story I can tell.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Every town has an arrival card — what the table costs and what moves you on —
  // and a send-off from its face once you have the next town's bankroll. In
  // between, the people who came up the ladder with you. docs/STORYBOARD.md is
  // the whole run as acts; these are in the order a player meets them.
  // ---------------------------------------------------------------------------

  // Act 1 — Silver Creek. Ray, and a rumour.
  {
    id: 'arrive-silvercreek',
    about: 'Arriving at Silver Creek: what the table costs, and the bankroll that buys the boat.',
    trigger: { kind: 'enterArea', areaId: 'sc-street' },
    actions: [
      { kind: 'dialogue', lines: ['Silver Creek. A casino at the end of the reservation road, and a dollar-two game inside it.'] },
      {
        kind: 'dialogue',
        speaker: 'Valet',
        lines: [
          'Valet: First time? A hundred to sit at the low-stakes table.',
          'Valet: Get yourself to six hundred and the riverboat upriver will have you.',
        ],
      },
    ],
  },
  {
    id: 'ray-is-due',
    about: 'Ray, thirty years at the dollar-two table: what staying looks like.',
    trigger: { kind: 'talkTo', characterId: 'ray' },
    conditions: [{ kind: 'chapter', cityId: 'silverCreek' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'ray',
        lines: [
          'Ray: Thirty years I have played that table. Thirty years I have been due.',
          'Ray: One of these days I walk out of there ahead, and I keep walking.',
          'Ray: You have got the look. Do not get the tab.',
        ],
      },
    ],
  },
  {
    id: 'dana-silvercreek',
    about: 'Dana turns up in the corner of the casino, and the rival becomes a rumour.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [{ kind: 'chapter', cityId: 'silverCreek' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: I go where the games are. Nobody minds a woman with a coffee in the corner.',
          'Dana: Somebody came through last month. Kit. Cleaned this table out and caught the bus the same night.',
          'Dana: You are slower than Kit. Slower lasts longer.',
        ],
      },
    ],
  },
  {
    id: 'ray-sees-you-off',
    about: "Silver Creek's send-off: once you have the boat money, Ray tells you to go.",
    trigger: { kind: 'talkTo', characterId: 'ray' },
    conditions: [
      { kind: 'chapter', cityId: 'silverCreek' },
      { kind: 'eventDone', eventId: 'ray-is-due' },
      { kind: 'cashAtLeast', amount: 600 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'ray',
        lines: [
          'Ray: Six hundred? Look at you. That is boat money.',
          'Ray: Riverbend. Two-five on a boat that has not moved in eleven years.',
          'Ray: Go and be due somewhere else for me.',
        ],
      },
    ],
  },

  // Act 2 — Riverbend Landing. Deb, Cass's money, and Kit in the flesh.
  {
    id: 'arrive-riverbend',
    about: 'Arriving at Riverbend: the boat, the bankroll that buys the Harbor, and somebody asking after you.',
    trigger: { kind: 'enterArea', areaId: 'rb-street' },
    actions: [
      { kind: 'dialogue', lines: ['Riverbend Landing. A riverboat that has not moved in eleven years, and a two-five game that never stops.'] },
      {
        kind: 'dialogue',
        speaker: 'Deckhand',
        lines: [
          'Deckhand: Three hundred to sit on the boat. Twenty-five hundred and the Harbor will look at you.',
          'Deckhand: Somebody on the dock was asking if Marcus’s friend had come upriver yet. Kit, they said.',
        ],
      },
    ],
  },
  {
    id: 'kit-on-the-dock',
    about: 'Meeting the rival: Kit is a town ahead, names the penthouse, and dares you to borrow.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [{ kind: 'chapter', cityId: 'riverbend' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: You are the one who took Marcus’s game. Word travels on the 14.',
          'Kit: Kit. I am a town ahead of you, and I mean to stay there.',
          'Kit: The Harbor, the island, the Mesa, then Porto Lumina. There is a penthouse up there with my name nearly on it.',
          'Kit: Cass will offer you money. Take it or do not. I would enjoy either.',
        ],
      },
    ],
  },
  {
    id: 'deb-on-kit',
    about: 'Deb on the rival, so the boat remembers who came through before you.',
    trigger: { kind: 'talkTo', characterId: 'deb' },
    conditions: [{ kind: 'chapter', cityId: 'riverbend' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'deb',
        lines: [
          'Deb: Kit was on the boat a week. Took Tiny for two thousand and tipped the bartender a chip.',
          'Deb: People like that do not stay anywhere. That is not a compliment.',
          'Deb: You want to be taken seriously here, come and find me in the diner.',
        ],
      },
    ],
  },
  {
    id: 'dana-riverbend',
    about: 'Dana at the riverboat bar, and the first sign she is watching for somebody else.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [{ kind: 'chapter', cityId: 'riverbend' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: Deb says you are polite. Deb does not say that.',
          'Dana: I write letters. An old habit. Somebody likes to read about the games.',
          'Dana: Do not ask who. Win something worth writing down.',
        ],
      },
    ],
  },
  {
    id: 'deb-sends-you-on',
    about: "Riverbend's send-off: once you have Harbor money, Deb tells you to go.",
    trigger: { kind: 'talkTo', characterId: 'deb' },
    conditions: [
      { kind: 'chapter', cityId: 'riverbend' },
      { kind: 'eventDone', eventId: 'deb-on-kit' },
      { kind: 'cashAtLeast', amount: 2500 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'deb',
        lines: [
          'Deb: Twenty-five hundred. That is Harbor money, sweetheart.',
          'Deb: They wear suits down there and they will not tell you the rules. Learn them anyway.',
          'Deb: Been here longer than you. Do not come back and prove it.',
        ],
      },
    ],
  },

  // Act 3 — Crescent Harbor. The mentor, and the rival a door ahead.
  {
    id: 'arrive-crescent',
    about: 'Arriving at Crescent Harbor: a name, a suit, and the room behind the room.',
    trigger: { kind: 'enterArea', areaId: 'ch-street' },
    actions: [
      { kind: 'dialogue', lines: ['Crescent Harbor. Card rooms with carpet, and doors that open for people the room already knows.'] },
      {
        kind: 'dialogue',
        speaker: 'Woman in a Suit',
        lines: [
          'Woman in a Suit: Five-ten in the card room, a thousand to sit. Build a name there first.',
          'Woman in a Suit: Get a real suit and the Harbour Room may send for you. Eight thousand and the ferry to Palm Cay will.',
        ],
      },
    ],
  },
  {
    id: 'hal-first-lesson',
    about:
      'Meeting the mentor: Hal taught Nadia Okonkwo once, and starts you on position. ' +
      'Talk to him again and he opens the book.',
    trigger: { kind: 'interact', poiId: 'hal' },
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: Forty years in card rooms. I still take students, if they pay and they listen.',
          'Hal: I taught a girl called Nadia Okonkwo once. Inside a year she stopped needing me.',
          'Hal: She lives above the casino in Porto Lumina now. You have heard. Everyone has heard.',
          'Hal: Start with position. Acting last is worth more than any card I could sell you.',
        ],
      },
    ],
  },
  {
    id: 'kit-harbor',
    about: 'The rival a door ahead: Kit is already through the Back Room, and points you at Vance.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [{ kind: 'chapter', cityId: 'crescentHarbor' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: The Back Room let me in on Tuesday. You need a suit and a name. You have neither.',
          'Kit: Practise on Vance at the heads-up table. I did. He will thank you for it.',
          'Kit: One on one is how she plays, at the top. Might as well learn it now.',
          'Kit: See you on the island. Or do not.',
        ],
      },
    ],
  },
  {
    id: 'dana-harbor',
    about: 'Dana at the supper club: Hal taught her too, and she stopped playing to watch.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [{ kind: 'chapter', cityId: 'crescentHarbor' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: Hal taught me, once. I was good.',
          'Dana: Then I was only good at watching, and it turned out somebody would pay for that.',
          'Dana: Take his lessons. He is cheap for what he knows.',
        ],
      },
    ],
  },
  {
    id: 'hal-sends-you-on',
    about: "Crescent Harbor's send-off: with island money, Hal says what to learn before the Mesa.",
    trigger: { kind: 'interact', poiId: 'hal' },
    conditions: [
      { kind: 'chapter', cityId: 'crescentHarbor' },
      { kind: 'eventDone', eventId: 'hal-first-lesson' },
      { kind: 'cashAtLeast', amount: 8000 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: Eight thousand. The island will have you, and the island is soft. Enjoy it.',
          'Hal: Learn to read people before you go up to the Mesa. Up there nobody twitches for free.',
          'Hal: I will be out there myself. The air is dry and the students do not listen.',
        ],
      },
    ],
  },

  // Act 4 — Palm Cay. The midpoint: home comes to visit, and the rival borrows.
  {
    id: 'arrive-palmcay',
    about: 'Arriving at Palm Cay: the soft money, the bankroll that buys the Mesa, and a face from home.',
    trigger: { kind: 'enterArea', areaId: 'pc-street' },
    actions: [
      { kind: 'dialogue', lines: ['Palm Cay. Linen, rum, and people who have forgotten what day it is, playing ten-twenty-five.'] },
      {
        kind: 'dialogue',
        speaker: 'Lifeguard',
        lines: [
          'Lifeguard: Twenty-five hundred to sit in the Cay Room. Thirty thousand and you are Mesa money.',
          'Lifeguard: Somebody from your home town was asking for you on the promenade. Nice guy. Terrible hat.',
        ],
      },
    ],
  },
  {
    id: 'marcus-on-holiday',
    about: 'The midpoint: Marcus takes the week off to see whether the stories about you are true.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'palmCay' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Surprise. I took the week off. I wanted to see if it was true.',
          'Marcus: It is true. You look like somebody who sits at these tables.',
          'Marcus: The Friday game misses you. Mostly it misses your money.',
          'Marcus: Lumina is two stops from here. I am not saying anything. I am just saying it is two stops.',
        ],
      },
    ],
  },
  {
    id: 'kit-palmcay',
    about: 'The rival face to face, and the turn: Kit is short of Lumina money and going to borrow it.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [{ kind: 'chapter', cityId: 'palmCay' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Rosa says you are Bernard’s new best friend. I had most of him before you got here.',
          'Kit: I am short of Lumina money. The Consortium out on the Mesa backs players. Forty thousand, two days.',
          'Kit: Two days is plenty. It is always plenty.',
        ],
      },
    ],
  },
  {
    id: 'marcus-goes-home',
    about: "Palm Cay's send-off: with Mesa money in your pocket, Marcus goes home believing it.",
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'palmCay' },
      { kind: 'eventDone', eventId: 'marcus-on-holiday' },
      { kind: 'cashAtLeast', amount: 30000 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Thirty thousand. I am going home before I start believing in things.',
          'Marcus: The Mesa is all lights and people who read books about this. Do not let them make you boring.',
          'Marcus: Call me from the top.',
        ],
      },
    ],
  },

  // Act 5 — Neon Mesa. The debt comes due on somebody else.
  {
    id: 'arrive-mesa',
    about: 'Arriving at Neon Mesa: the studied money, and the bankroll that buys the plane to Lumina.',
    trigger: { kind: 'enterArea', areaId: 'nm-street' },
    actions: [
      { kind: 'dialogue', lines: ['Neon Mesa. Everything lit, everybody studied, and nobody at the tables twitches for free.'] },
      {
        kind: 'dialogue',
        speaker: 'Tout',
        lines: [
          'Tout: Ten thousand for the main game. Ninety and they will put you on the plane to Lumina.',
          'Tout: And the high roller room looks at your shoes. I am serious about the shoes.',
        ],
      },
    ],
  },
  {
    id: 'hal-mesa-last-stop',
    about: 'The mentor at the last stop he can teach: after the Mesa it is just her.',
    trigger: { kind: 'interact', poiId: 'hal-mesa' },
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: You made it out here. Good.',
          'Hal: Up here the tells are nearly gone. Learn them anyway, so you know what you are not seeing.',
          'Hal: After the Mesa it is just her, and I cannot teach you her. I tried teaching her once. She learned faster than I taught.',
        ],
      },
    ],
  },
  {
    id: 'kit-mesa',
    about:
      'The debt made flesh: two days into the Consortium’s money and short, Kit ' +
      'heads to Lumina to settle it in one match.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [{ kind: 'chapter', cityId: 'neonMesa' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Do not. I know what I look like.',
          'Kit: Day two of the Consortium’s money and I am eleven thousand short. The Invitational will not have me.',
          'Kit: Nadia takes challengers. One match and everything is square.',
          'Kit: I am on the plane tonight. Do not follow me too fast.',
        ],
      },
    ],
  },
  {
    id: 'dana-mesa',
    about: 'Dana at Ultraviolet stops pretending she only watches: somebody will want to meet you.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [{ kind: 'chapter', cityId: 'neonMesa' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: August runs the Invitational. He reads my letters too, sometimes.',
          'Dana: Kit has the Consortium’s money. You know how that goes.',
          'Dana: Somebody is going to want to meet you soon. Do not ask who. You know who.',
        ],
      },
    ],
  },
  {
    id: 'dana-sends-you-up',
    about: "Neon Mesa's send-off: with Lumina money, Dana tells you to take the plane.",
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'neonMesa' },
      { kind: 'eventDone', eventId: 'dana-mesa' },
      { kind: 'cashAtLeast', amount: 90000 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: ['Dana: Ninety. Take the plane.', 'Dana: I will be there before you. I usually am.'],
      },
    ],
  },

  // Act 6 — Porto Lumina. Everything that followed you up was pointing here.
  {
    id: 'arrive-lumina',
    about: 'Arriving at Porto Lumina: the nosebleed, the match, and the man who photographs the winner.',
    trigger: { kind: 'enterArea', areaId: 'pl-street' },
    actions: [
      {
        kind: 'dialogue',
        lines: ['Porto Lumina. A waterfront, a tower lit from the base, and forty-one floors above the casino, a penthouse.'],
      },
      {
        kind: 'dialogue',
        speaker: 'Photographer',
        lines: [
          'Photographer: Thirty thousand at the nosebleed. A hundred and twenty for the match with Ms. Okonkwo.',
          'Photographer: Four years I have photographed her winning. Give me a reason to photograph somebody else.',
        ],
      },
    ],
  },
  {
    id: 'kit-lumina',
    about: 'The rival broken: forty hands against Nadia, the Consortium’s men, and a warning about Wen.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Forty hands. She took me apart in forty hands.',
          'Kit: She knew what I would do before I did. Like somebody had written it down for her.',
          'Kit: The Consortium has sent two men. I am on the next boat out, if they let me reach it.',
          'Kit: Do not take Wen’s money for the buy-in. Do not be me.',
        ],
      },
    ],
  },
  {
    id: 'nadia-names-the-match',
    about:
      'Meeting the final rival before the table: she knows the kitchen table, somebody ' +
      'has been writing to her about you, and she sends a car for Marcus.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: So you are the one from the kitchen table in Basin.',
          'Nadia: Somebody I trust has been writing to me about you since Marcus’s game.',
          'Nadia: One match, heads up. A hundred and twenty thousand each. The winner takes the pot and the floor upstairs.',
          'Nadia: I have sent a car for your friend Marcus. A challenger should have somebody at the rail.',
          'Nadia: Come back when you are ready. You will know.',
        ],
      },
    ],
  },
  {
    id: 'dana-reveal',
    about: 'The reveal: Dana has been Nadia’s scout all along, writing to her about you since the first night.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: So she told you somebody was writing to her.',
          'Dana: I am the somebody. Four years I have gone where the games are, and written her a letter from each one.',
          'Dana: She asked me to find the next one. I found you at Marcus’s kitchen table, raising the river with nothing.',
          'Dana: Do not look at me like that. I told her you were worth watching. I meant it.',
        ],
      },
    ],
  },
  {
    id: 'marcus-at-the-rail',
    about: 'Marcus arrives for the match: whatever happens, the kitchen table is still there.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      // He is only in Porto Lumina once she has sent the car; saying so keeps
      // this apart from the kitchen table he deals in Basin before then.
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: A car. She sent a car, man. The driver called me Mr. Marcus.',
          'Marcus: I am not going to watch. I am absolutely going to watch.',
          'Marcus: Whatever happens up there, the kitchen table is still in my kitchen.',
        ],
      },
    ],
  },
  {
    id: 'hal-on-the-eve',
    about: 'The mentor turns up anyway, with the one heads-up lesson he never sold.',
    trigger: { kind: 'talkTo', characterId: 'hal' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: I said I would not come. I came.',
          'Hal: Heads up, the button posts the small blind. It acts first before the flop and last after it.',
          'Hal: So play plenty of hands from the button and fewer from the big blind. With two of you, position matters more, not less.',
          'Hal: And there is no tell. Stop looking for one. Play the pot odds, play the position, play the person.',
        ],
      },
    ],
  },

  // Aftermath — forty-one floors up. The people who got you there.
  {
    id: 'marcus-upstairs',
    about: 'Aftermath: Marcus in the penthouse lobby. Winner hosts.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Forty-one floors. I counted the buttons in the lift.',
          'Marcus: You know the rule. Winner hosts. The Friday game is at yours now.',
          'Marcus: I will bring the ice.',
        ],
      },
    ],
  },
  {
    id: 'dana-after',
    about: 'Aftermath: Dana brings Nadia’s note, and offers to keep watching — for you this time.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: She left you a note. It says: Watch for the next one.',
          'Dana: Somebody will sit down at a kitchen table somewhere tonight and take everything. Somebody always does.',
          'Dana: I could write to you about them. If you like.',
        ],
      },
    ],
  },
  {
    id: 'kit-after',
    about: 'Aftermath: the rival asks the winner for a stake. You are the sponsor now.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: You did it. Of course you did. You were slower.',
          'Kit: I am told you are the one people come to now. For a stake.',
          'Kit: Not today. But remember I asked nicely.',
        ],
      },
    ],
  },
  {
    id: 'hal-after',
    about: 'Aftermath: the mentor admits where his money was.',
    trigger: { kind: 'talkTo', characterId: 'hal' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: ['Hal: I had money on her. Do not tell her.', 'Hal: Then again, I taught you both. I was always going to win something.'],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // When it goes wrong. Losing is part of the run, not the end of it: every
  // setback is noticed by somebody who knows you, and every one of them says
  // what to do next. docs/STORYBOARD.md, "When it goes wrong", is the map.
  // ---------------------------------------------------------------------------

  // Going broke. Below the cheapest seat on the ladder there is always the
  // kitchen table: Marcus deals you back in wherever he is, and the bus home
  // costs nothing.
  {
    id: 'poker-night-again',
    about: 'Walked out of the first poker night a loser: Marcus deals you back in whenever you come back.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night' },
      { kind: 'period', period: ['afternoon', 'evening', 'night'] },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Back for more? Good. The chairs are still warm.',
          'Marcus: Same rule. Everything on the table, winner takes the lot.',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'marcus-deals-you-back-in',
    about:
      'The way back from broke: below the cheapest seat on the ladder, Marcus deals the kitchen table ' +
      'again — the same game that started the run. Wherever the story has got to, while he is home.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'cashBelow', amount: 100 },
      { kind: 'chapter', cityId: ['apartment', 'silverCreek', 'riverbend', 'crescentHarbor', 'neonMesa', 'portoLumina'] },
      { kind: 'eventDone', eventId: 'nadia-names-the-match', done: false },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Look at you. You look like the first night.',
          'Marcus: Nobody stays broke at my table. Sit down. Same rule as always.',
          'Marcus: Win it back off me, and then go and do it properly.',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'marcus-deals-on-holiday',
    about: 'Broke at the midpoint: Marcus, on holiday, brought cards. He always brings cards.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'palmCay' },
      { kind: 'eventDone', eventId: 'marcus-on-holiday' },
      { kind: 'cashBelow', amount: 100 },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Cleaned out? On an island? That takes talent.',
          'Marcus: I brought cards. I always bring cards. Kitchen-table rules, beach edition.',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'marcus-deals-at-the-rail',
    about: 'Broke in Porto Lumina, with the match still to play: back to the kitchen table, at the rail.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'eventDone', eventId: 'marcus-at-the-rail' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'cashBelow', amount: 100 },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Nothing left? Then it is the kitchen table. It is always the kitchen table.',
          'Marcus: Win it back off me. We will worry about her after.',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'marcus-deals-upstairs',
    about: 'Broke after the penthouse: winner hosts, so Marcus makes you host.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'eventDone', eventId: 'marcus-upstairs' },
      { kind: 'cashBelow', amount: 100 },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Broke, in a penthouse. You are a legend in two directions.',
          'Marcus: Winner hosts. So host. Deal me in.',
        ],
      },
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'ray-busted',
    about: 'Broke at Silver Creek: Ray, thirty years broke, tells you the one thing he never did — go home.',
    trigger: { kind: 'talkTo', characterId: 'ray' },
    conditions: [
      { kind: 'eventDone', eventId: 'ray-is-due' },
      { kind: 'cashBelow', amount: 100 },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'ray',
        lines: [
          'Ray: Cleaned out? Welcome. I have been a member thirty years.',
          'Ray: Here is what I never did: go home. The bus home costs nothing. Nobody charges you to go home.',
          'Ray: Marcus still deals, does he not? Win it off him again and come back up the road with something to sit down with.',
        ],
      },
    ],
  },
  {
    id: 'ray-sees-you-back',
    about: 'The comeback: broke once, back at boat money, and Ray has never once managed it.',
    trigger: { kind: 'talkTo', characterId: 'ray' },
    conditions: [
      { kind: 'eventDone', eventId: 'ray-is-due' },
      { kind: 'eventDone', eventId: 'ray-sees-you-off' },
      { kind: 'count', of: 'busted' },
      { kind: 'cashAtLeast', amount: 600 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'ray',
        lines: [
          'Ray: Six hundred. From nothing. I have never once done that.',
          'Ray: Thirty years I have been due, and you went and collected it for me.',
          'Ray: Go on. Riverbend. And this time do not come back.',
        ],
      },
      { kind: 'setFlag', flag: 'cameBack' },
    ],
  },
  {
    id: 'dana-silvercreek-broke',
    about: 'Dana, in the corner of the casino, on going broke at the first real table: everyone does once.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'silverCreek' },
      { kind: 'eventDone', eventId: 'dana-silvercreek' },
      { kind: 'cashBelow', amount: 100 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: Everyone goes broke at that table once. Kit did not. That is the most annoying thing about Kit.',
          'Dana: Marcus still deals. He would deal for you on a Tuesday.',
          'Dana: Go home. Win it back. I will write it down either way.',
        ],
      },
    ],
  },
  {
    id: 'hal-short-for-the-harbor',
    about: 'Short of the Harbor Room’s buy-in: Hal’s bankroll lesson, and the way back down the ladder.',
    trigger: { kind: 'interact', poiId: 'hal' },
    conditions: [
      { kind: 'eventDone', eventId: 'hal-first-lesson' },
      { kind: 'cashBelow', amount: 1000 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: Short of the Harbor Room? Then you were playing too big for your roll.',
          'Hal: Twenty buy-ins for the game you sit in. Nobody believes that until tonight.',
          'Hal: Take the boat back down to Riverbend. Three hundred to sit. Win the Harbor back at stakes you can afford to lose.',
        ],
      },
    ],
  },

  // The rent, from the window on day one to the receipt under the door.
  {
    id: 'rent-day',
    about: 'Nine days on and the Friday game still unwon: rent day comes, and Marcus has vouched for you.',
    trigger: { kind: 'interact', poiId: 'apartment-window' },
    conditions: [
      { kind: 'dayAtLeast', day: 10 },
      { kind: 'flag', flag: 'wonPokerNight', set: false },
    ],
    actions: [
      { kind: 'dialogue', lines: ['Rent day came and went. Nobody knocked.'] },
      {
        kind: 'dialogue',
        lines: [
          'Under the door, a note from the landlord. Under that, in Marcus’s handwriting:',
          'TOLD HIM YOU ARE GOOD FOR IT. COME AND WIN IT OFF ME.',
        ],
      },
    ],
  },
  {
    id: 'rent-receipt',
    about:
      'Home again after leaving Basin — usually broke: the rent is paid, every week since you went. ' +
      'Marcus said he would cover it, and the flat is still yours to come back to.',
    trigger: { kind: 'enterArea', areaId: 'home' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: ['silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa', 'portoLumina'] },
    ],
    actions: [
      { kind: 'dialogue', lines: ['Under the door: a rent receipt, stamped PAID, for every week since you left.'] },
      {
        kind: 'dialogue',
        lines: ['On the back, in Marcus’s handwriting: YOUR ROOM IS HERE WHEN YOU WANT IT. SO IS THE GAME.'],
      },
    ],
  },

  // Sponsors. A stake used to be a menu and nothing else; now the sponsor
  // notices whether you are owing, late, or square — and their collector is a
  // person, who stands beside them while you owe on time.
  {
    id: 'cass-owing',
    about: 'Back at Cass’s pitch while her clock runs: she introduces Dutch.',
    trigger: { kind: 'interact', poiId: 'cass' },
    conditions: [{ kind: 'debt', sponsorId: 'cass', status: 'owing' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: Back already? The clock is running.',
          'Cass: That is Dutch by the bollard. He is family. He is also how I collect.',
          'Cass: Three days means three days. Come and pay me before the third one is out.',
        ],
      },
    ],
  },
  {
    id: 'cass-overdue',
    about: 'Cass, once the stake has run out: Dutch is looking for you, and paying calls him off.',
    trigger: { kind: 'interact', poiId: 'cass' },
    conditions: [{ kind: 'debt', sponsorId: 'cass', status: 'overdue' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: You are late. I told you what late means.',
          'Cass: Dutch is out looking for you. Pay me now and I call him in for his tea.',
        ],
      },
    ],
  },
  {
    id: 'cass-repaid',
    about: 'Cass, paid on the day: nobody comes back. She wants to see the top.',
    trigger: { kind: 'interact', poiId: 'cass' },
    conditions: [
      { kind: 'debt', sponsorId: 'cass', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'cass' },
      { kind: 'count', of: 'missed', sponsorId: 'cass', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: You came back. Nobody comes back.',
          'Cass: Paid on the day. I am going to tell people about you.',
          'Cass: If you ever get to the top, I want to see it. I have never seen the top.',
        ],
      },
    ],
  },
  {
    id: 'cass-repaid-late',
    about: 'Cass, paid after Dutch had to come looking: late, but square, and she still wants to see the top.',
    trigger: { kind: 'interact', poiId: 'cass' },
    conditions: [
      { kind: 'debt', sponsorId: 'cass', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'cass' },
      { kind: 'count', of: 'missed', sponsorId: 'cass' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: Late. But here, which is more than most.',
          'Cass: Dutch says you run like a deer. From Dutch that is fond.',
          'Cass: Get to the top and I might come and watch. I have never seen the top.',
        ],
      },
    ],
  },
  {
    id: 'cass-at-the-top',
    about: 'Paid her back, and Cass has come to Porto Lumina to see what the top looks like.',
    trigger: { kind: 'talkTo', characterId: 'cass' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'count', of: 'repaid', sponsorId: 'cass' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: Nobody pays me back, and nobody I have backed ever got this far. You did both.',
          'Cass: I came to see what the top looks like. It looks expensive.',
          'Cass: Win, and I tell the whole river I staked you.',
        ],
      },
    ],
  },
  {
    id: 'cass-after-you-won',
    about: 'Aftermath: Cass tells the river she staked the player who took the penthouse.',
    trigger: { kind: 'talkTo', characterId: 'cass' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'count', of: 'repaid', sponsorId: 'cass' },
      { kind: 'flag', flag: 'hasPenthouse' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: ['Cass: I tell everybody on the river I staked you.', 'Cass: I leave out that it was fifteen hundred.'],
      },
    ],
  },
  {
    id: 'emeka-owing',
    about: 'Back at Mr. Emeka’s table while his three days run: Abel is never far away.',
    trigger: { kind: 'interact', poiId: 'emeka' },
    conditions: [{ kind: 'debt', sponsorId: 'emeka', status: 'owing' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'emeka',
        lines: [
          'Mr. Emeka: Three days is a long time to be patient. I am being patient now.',
          'Mr. Emeka: Abel will be nearby. Abel is always nearby. It is restful, once you are used to it.',
        ],
      },
    ],
  },
  {
    id: 'emeka-overdue',
    about: 'Mr. Emeka, once the stake has run out: his patience has gone before yours, and Abel is out.',
    trigger: { kind: 'interact', poiId: 'emeka' },
    conditions: [{ kind: 'debt', sponsorId: 'emeka', status: 'overdue' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'emeka',
        lines: [
          'Mr. Emeka: I liked you for your patience. Mine has run out first.',
          'Mr. Emeka: Abel is looking for you. He will be very polite about it, and very thorough.',
        ],
      },
    ],
  },
  {
    id: 'emeka-repaid',
    about: 'Mr. Emeka, paid to the dollar on the day: he will see you on the Mesa.',
    trigger: { kind: 'interact', poiId: 'emeka' },
    conditions: [
      { kind: 'debt', sponsorId: 'emeka', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'emeka' },
      { kind: 'count', of: 'missed', sponsorId: 'emeka', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'emeka',
        lines: [
          'Mr. Emeka: On the day, to the dollar. You would be surprised how rare that is.',
          'Mr. Emeka: I go out to the Mesa when the season turns. If you are there, I will buy you a terrible coffee.',
        ],
      },
    ],
  },
  {
    id: 'emeka-repaid-late',
    about: 'Mr. Emeka, paid after Abel had to find you: square, and still patient with you.',
    trigger: { kind: 'interact', poiId: 'emeka' },
    conditions: [
      { kind: 'debt', sponsorId: 'emeka', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'emeka' },
      { kind: 'count', of: 'missed', sponsorId: 'emeka' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'emeka',
        lines: [
          'Mr. Emeka: Late, and lighter than you were, I hear. But paid.',
          'Mr. Emeka: Abel says you took it well. He respects people who take it well.',
          'Mr. Emeka: I am out on the Mesa when the season turns. Come and be patient there.',
        ],
      },
    ],
  },
  {
    id: 'emeka-at-the-mesa',
    about: 'Paid him back, and Mr. Emeka turns up on the Strip with a new player and some advice.',
    trigger: { kind: 'talkTo', characterId: 'emeka' },
    conditions: [
      { kind: 'chapter', cityId: 'neonMesa' },
      { kind: 'count', of: 'repaid', sponsorId: 'emeka' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'emeka',
        lines: [
          'Mr. Emeka: You found me. Or I found you. At my age it is the same thing.',
          'Mr. Emeka: My new player is not patient. I keep telling him about you.',
          'Mr. Emeka: The Consortium’s broker is along the Strip. Do not borrow from people who say “line item”.',
        ],
      },
    ],
  },
  {
    id: 'consortium-owing',
    about: 'The Broker while the Consortium’s two days run: you are a line item, and so is Kit.',
    trigger: { kind: 'interact', poiId: 'consortium' },
    conditions: [{ kind: 'debt', sponsorId: 'consortium', status: 'owing' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Broker',
        lines: [
          'Broker: You are a line item now. Line items have dates.',
          'Broker: Your friend Kit has the same date. Kit is not going to make it. Be a better line.',
          'Broker: Mr. Lowe will be about. You will not notice him until it matters.',
        ],
      },
    ],
  },
  {
    id: 'consortium-overdue',
    about: 'The Broker once the date has passed: Mr. Lowe has been informed.',
    trigger: { kind: 'interact', poiId: 'consortium' },
    conditions: [{ kind: 'debt', sponsorId: 'consortium', status: 'overdue' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Broker',
        lines: [
          'Broker: Your date has passed. Mr. Lowe has been informed.',
          'Broker: Pay here and the file closes. Do not, and it opens wider.',
        ],
      },
    ],
  },
  {
    id: 'consortium-repaid',
    about: 'The Consortium, paid on the date: a short file, which is a compliment.',
    trigger: { kind: 'interact', poiId: 'consortium' },
    conditions: [
      { kind: 'debt', sponsorId: 'consortium', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'consortium' },
      { kind: 'count', of: 'missed', sponsorId: 'consortium', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Broker',
        lines: ['Broker: Paid, on the date. We will put that in the file.', 'Broker: It is a short file. That is a compliment.'],
      },
    ],
  },
  {
    id: 'consortium-repaid-late',
    about: 'The Consortium, paid after Mr. Lowe had to collect: the file is complete.',
    trigger: { kind: 'interact', poiId: 'consortium' },
    conditions: [
      { kind: 'debt', sponsorId: 'consortium', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'consortium' },
      { kind: 'count', of: 'missed', sponsorId: 'consortium' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Broker',
        lines: ['Broker: Late, collected on, paid. The file is complete.', 'Broker: Mr. Lowe says you were reasonable. He does not say that often.'],
      },
    ],
  },
  {
    id: 'wen-owing',
    about: 'Madame Wen while her two days run: Ms. Fong has opened your page.',
    trigger: { kind: 'interact', poiId: 'wen' },
    conditions: [{ kind: 'debt', sponsorId: 'wen', status: 'owing' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Madame Wen',
        lines: [
          'Madame Wen: Ms. Fong has opened your page. She writes small.',
          'Madame Wen: Two days. Win upstairs and you will barely notice me. Lose, and you will notice nothing else.',
        ],
      },
    ],
  },
  {
    id: 'wen-overdue',
    about: 'Madame Wen once the stake has run out: everyone takes this deal once, and Ms. Fong is on the waterfront.',
    trigger: { kind: 'interact', poiId: 'wen' },
    conditions: [{ kind: 'debt', sponsorId: 'wen', status: 'overdue' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Madame Wen',
        lines: [
          'Madame Wen: Everyone at your level takes this deal once. Most of them stood where you are standing.',
          'Madame Wen: Ms. Fong is on the waterfront with your page. Pay me, and she closes the book.',
        ],
      },
    ],
  },
  {
    id: 'wen-repaid',
    about: 'Madame Wen, paid on time: almost nobody pays it, and she will remember your face.',
    trigger: { kind: 'interact', poiId: 'wen' },
    conditions: [
      { kind: 'debt', sponsorId: 'wen', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'wen' },
      { kind: 'count', of: 'missed', sponsorId: 'wen', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Madame Wen',
        lines: [
          'Madame Wen: On time. Everyone takes this deal once. Almost nobody pays it.',
          'Madame Wen: I will remember your face. That is not a threat any more.',
        ],
      },
    ],
  },
  {
    id: 'wen-repaid-late',
    about: 'Madame Wen, paid in the end: Kit was right, and you are still standing.',
    trigger: { kind: 'interact', poiId: 'wen' },
    conditions: [
      { kind: 'debt', sponsorId: 'wen', status: 'none' },
      { kind: 'count', of: 'repaid', sponsorId: 'wen' },
      { kind: 'count', of: 'missed', sponsorId: 'wen' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Madame Wen',
        lines: [
          'Madame Wen: Paid, in the end. Ms. Fong has closed the book and underlined the total.',
          'Madame Wen: Kit told you not to take my money. Kit was right, and you are still standing. That is rarer than being right.',
        ],
      },
    ],
  },

  // The collectors catch you. Each sponsor's person says their piece standing
  // over you; the shakedown follows the last line and costs three quarters of
  // what you carry. The debt stays where it was.
  {
    id: 'caught-by-dutch',
    about: 'Cass’s collector, the first time: apologetic, thorough, and he leaves you bus fare.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'cass' },
      { kind: 'count', of: 'caught', sponsorId: 'cass', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dutch',
        lines: [
          'Dutch: Sorry. Sorry about this. She is my wife’s sister.',
          'Dutch: Pockets out for me? I will leave you bus fare. I always leave bus fare.',
          'Dutch: You still owe her, mind. This is just what late costs.',
        ],
      },
    ],
  },
  {
    id: 'caught-by-dutch-again',
    about: 'Cass’s collector, every time after the first.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'cass' },
      { kind: 'count', of: 'caught', sponsorId: 'cass' },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dutch',
        lines: ['Dutch: Again? I am starting to think we are friends.', 'Dutch: Same as last time. Pockets. Bus fare stays. The debt stays.'],
      },
    ],
  },
  {
    id: 'caught-by-abel',
    about: 'Mr. Emeka’s collector, the first time: perfectly polite, and he takes most of it.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'emeka' },
      { kind: 'count', of: 'caught', sponsorId: 'emeka', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'abel',
        lines: [
          'Abel: Good evening. Mr. Emeka sends his regards, and me.',
          'Abel: I will take most of what you are carrying. Not all. He wants you able to pay him.',
          'Abel: The debt remains. Please do not make me find you twice.',
        ],
      },
    ],
  },
  {
    id: 'caught-by-abel-again',
    about: 'Mr. Emeka’s collector, every time after the first.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'emeka' },
      { kind: 'count', of: 'caught', sponsorId: 'emeka' },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'abel',
        lines: ['Abel: Twice. I did ask.', 'Abel: Mr. Emeka still believes in you. I am beginning to think he is the only one.'],
      },
    ],
  },
  {
    id: 'caught-by-lowe',
    about: 'The Consortium’s man, the first time: the same men who are hunting Kit.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'consortium' },
      { kind: 'count', of: 'caught', sponsorId: 'consortium', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'lowe',
        lines: [
          'Mr. Lowe: We said we do not lose track of people.',
          'Mr. Lowe: Three quarters of what you carry. The balance stands.',
          'Mr. Lowe: Your friend Kit did not believe in the balance either.',
        ],
      },
    ],
  },
  {
    id: 'caught-by-lowe-again',
    about: 'The Consortium’s man, every time after the first.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'consortium' },
      { kind: 'count', of: 'caught', sponsorId: 'consortium' },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'lowe',
        lines: ['Mr. Lowe: Again. The file is getting thick.', 'Mr. Lowe: Pay the Broker. It is cheaper than us.'],
      },
    ],
  },
  {
    id: 'caught-by-fong',
    about: 'Madame Wen’s bookkeeper, the first time: an entry against your page.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'wen' },
      { kind: 'count', of: 'caught', sponsorId: 'wen', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'fong',
        lines: [
          'Ms. Fong: I keep the book. Today I am also the bailiff.',
          'Ms. Fong: Three quarters, entered against your page. The total has not moved.',
          'Ms. Fong: Madame Wen wants her money, not your misery. Pay her and I stop visiting.',
        ],
      },
    ],
  },
  {
    id: 'caught-by-fong-again',
    about: 'Madame Wen’s bookkeeper, every time after the first.',
    trigger: { kind: 'caught' },
    conditions: [
      { kind: 'hunted', sponsorId: 'wen' },
      { kind: 'count', of: 'caught', sponsorId: 'wen' },
    ],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'fong',
        lines: ['Ms. Fong: Another entry. Yours is the longest page in the book this month.', 'Ms. Fong: Madame Wen is a patient woman. The book is not.'],
      },
    ],
  },

  // The match lost. She makes you wait a week; everyone who followed you up
  // says what to do with it; the rematch is the comeback.
  {
    id: 'nadia-makes-you-wait',
    about: 'Lost the match: Nadia will not play the same person twice in a week. Come back as somebody else.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    conditions: [
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'challenge', status: 'lost' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: Not tonight. I do not play the same person twice in one week.',
          'Nadia: Come back as somebody else. Somebody I have not read about.',
        ],
      },
    ],
  },
  {
    id: 'nadia-rematch',
    about: 'The week is up: Nadia will put the penthouse on the table again. Most do not come back.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    conditions: [
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'challenge', status: 'rematch' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: You came back. They mostly do not.',
          'Nadia: Same terms. A hundred and twenty thousand each, and the floor upstairs. Sit down when you are ready.',
        ],
      },
    ],
  },
  {
    id: 'marcus-after-the-loss',
    about: 'Marcus after the lost match: not unlucky, she was better tonight — build it back, like after his kitchen table.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'marcus-at-the-rail' },
      { kind: 'challenge', status: ['lost', 'rematch'] },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'cashAtLeast', amount: 100 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: I watched every hand. You were not unlucky. She was better tonight.',
          'Marcus: You know what you do now. Same as after my kitchen table: build it back, come back better.',
          'Marcus: A hundred and twenty to sit down again, and a week before she will. I have taken the week off. Again.',
        ],
      },
    ],
  },
  {
    id: 'marcus-rematch-night',
    about: 'The rematch is on and the buy-in is in your pocket: Marcus has the ice.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'marcus-at-the-rail' },
      { kind: 'eventDone', eventId: 'marcus-after-the-loss' },
      { kind: 'challenge', status: 'rematch' },
      { kind: 'cashAtLeast', amount: 120000 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: She has racked it up again. You have the money. I have the ice.',
          'Marcus: Nobody remembers who won the first time. Everybody remembers the second.',
        ],
      },
    ],
  },
  {
    id: 'dana-after-the-loss',
    about: 'Dana after the lost match: Nadia knew your game because Dana wrote it down — so play the other game.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'dana-reveal' },
      { kind: 'challenge', status: ['lost', 'rematch'] },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: I did not write to her about tonight. She was there.',
          'Dana: She knew your river raise before you made it. I told her about it a year ago.',
          'Dana: So stop doing it. Everything I ever wrote down, do the other thing. She has never read about that player.',
        ],
      },
    ],
  },
  {
    id: 'dana-the-letter-she-kept',
    about: 'Before the match, if you came back from going broke: the letter Nadia kept was that one.',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'dana-reveal' },
      { kind: 'challenge', status: 'unplayed' },
      { kind: 'flag', flag: 'cameBack' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: She keeps one of my letters on the desk upstairs. The one about the night you went broke, and came back.',
          'Dana: Anybody can win. She wanted to know who comes back.',
        ],
      },
    ],
  },
  {
    id: 'hal-after-the-loss',
    about: 'Hal after the lost match: what she did to you, and the heads-up adjustments that answer it.',
    trigger: { kind: 'talkTo', characterId: 'hal' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'hal-on-the-eve' },
      { kind: 'challenge', status: ['lost', 'rematch'] },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: She did to you what she did to me. She raised your big blind every time you let her.',
          'Hal: Heads up you are getting a price in the big blind. Defend it wide, and three-bet her back sometimes, or she owns it.',
          'Hal: And stop limping the button. Raise it or fold it. A limp tells her you have a hand you do not want to play.',
          'Hal: A week. Play heads up somewhere, anywhere, until those are habits.',
        ],
      },
    ],
  },
  {
    id: 'kit-caught',
    about: 'Kit’s debt comes due on Kit: the Consortium’s men caught him, took three quarters, and the debt did not move.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'kit-lumina' },
      { kind: 'challenge', status: 'unplayed' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: They let me reach the boat. Then they got off it with me.',
          'Kit: Three quarters of everything I had, and the debt did not move a cent. Nobody tells you that part.',
          'Kit: So I am playing the nosebleed until it is square. Do not take Wen’s money.',
        ],
      },
    ],
  },
  {
    id: 'kit-after-the-loss',
    about: 'Kit after your lost match, if you heeded him about Wen: you can come back from this, which he could not.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'kit-lumina' },
      { kind: 'challenge', status: ['lost', 'rematch'] },
      { kind: 'debt', sponsorId: 'wen', status: 'none' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Forty hands for me. How many for you?',
          'Kit: She knew what you would do. Like somebody had written it down for her. Ask your friend in the corner about that.',
          'Kit: You did not take Wen’s money, though. So you can come back from this. I could not.',
        ],
      },
    ],
  },
  {
    id: 'kit-told-you',
    about: 'Kit after your lost match, if you took Wen’s money: he told you, and here is how the debt works from inside it.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'kit-lumina' },
      { kind: 'challenge', status: ['lost', 'rematch'] },
      { kind: 'debt', sponsorId: 'wen', status: ['owing', 'overdue'] },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: You took Wen’s money. I said do not be me.',
          'Kit: Listen, then, because I know this part. Skip town and they lose you for a day. Get caught and they take three quarters and leave the debt.',
          'Kit: Pay her first, then the match. Nadia waits a week. Wen does not wait at all.',
        ],
      },
    ],
  },
  {
    id: 'kit-squares-up',
    about: 'Aftermath, the debt arc’s end on the winning side: Kit squared the Consortium himself.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'eventDone', eventId: 'kit-after' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: I squared the Consortium. Eleven days at the nosebleed, every hand like it was my last, because it was.',
          'Kit: So I do not need your stake after all. I wanted you to know I asked anyway.',
        ],
      },
    ],
  },
  {
    id: 'marcus-second-time',
    about: 'Aftermath of a rematch won: Marcus has the version he is telling, and sets the comeback down as one.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'eventDone', eventId: 'marcus-upstairs' },
      { kind: 'count', of: 'challengeLost' },
      { kind: 'cashAtLeast', amount: 100 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Lost it, came back for it, took it. That is the version I am telling.',
          'Marcus: Nobody wants to hear about somebody who won the first time.',
        ],
      },
      { kind: 'setFlag', flag: 'cameBack' },
    ],
  },
]
