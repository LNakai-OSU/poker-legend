import type { TimePeriod } from '../game/time'
import type { StoryFlag } from './flags'
import type { TapeExhibit } from './tape'
import { ERRAND_EVENTS } from './errands'
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
  /**
   * Walking into an area, however you got there. With `onLoad`, also finding
   * yourself there without walking in — loading a save that stands there, or
   * getting up from a table in it: a beat that has to happen before anything
   * else in the area (the opening; the scene after the first poker night) is
   * not skipped by a reload in the middle of it.
   */
  | { kind: 'enterArea'; areaId: string; onLoad?: boolean }
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
  /** The final table is over: the last chip is yours, or you are out of them. */
  | { kind: 'finaleWon' }
  | { kind: 'finaleLost' }
  | { kind: 'tournamentWon' }
  | { kind: 'tournamentLost' }

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
   * You owe this sponsor something and hold enough to pay all of it now — the
   * condition on a choice's "pay her back" answer.
   */
  | { kind: 'canPay'; sponsorId: string }
  /**
   * Where you stand on a town's casino goal: `roomOpen` (you have won enough on
   * the floor for the private room) or `bossBeaten`. Holds when it is so, or,
   * with `set: false`, when it is not.
   */
  | { kind: 'casino'; cityId: CityId; status: 'roomOpen' | 'bossBeaten'; set?: boolean }

/** A tile on the map the beat is playing in. */
export interface Tile {
  col: number
  row: number
}

/**
 * Where somebody is moved to: a tile, or `'player'` — the free tile next to the
 * player nearest to whoever is coming, which is how somebody walks up to you
 * wherever you happen to be standing.
 */
export type Spot = Tile | 'player'

/** How fast a beat moves somebody: a stroll beside you, or running to catch you up. */
export type Pace = 'walk' | 'run'

/** A text box. `speaker` is a character id, or a plain name, or nothing. */
export interface DialogueAction {
  kind: 'dialogue'
  speaker?: string
  lines: string[]
}

/** Where a reel panel is set: the broadcast and the nights around it. Drawn by `ReelScene`. */
export type ReelScene =
  | 'logo'
  | 'mail'
  | 'studio'
  | 'corridor'
  | 'bathroom'
  | 'mirror'
  | 'phone'
  | 'booth'
  | 'alley'
  | 'chase'
  | 'sink'
  | 'rail'
  | 'night'
  /** Hal's old tape: a chalkboard, a desk, and whatever his line puts up on the board. Drawn by `TapePanel`. */
  | 'tape'

/** The scripted scenes `cinematic` can play. */
export type CinematicId = 'bad-beat' | 'ending' | 'slide' | 'retry'

/** One thing said in a reel. `who` is a character id or a plain name, such as a commentator. */
export interface ReelLine {
  who: string
  text: string
  /** Put this on the board from this line on (a `tape` panel); the last one stays up until another replaces it. */
  show?: TapeExhibit
}

/** A set and what is said in front of it. */
export interface ReelPanel {
  scene: ReelScene
  /** A line of stage direction under the picture. */
  caption?: string
  /** The broadcast's lower third: a stack, a blind level, a score. */
  ticker?: string
  /** What the phone shows: one lock-screen card each, in the order they arrive. */
  notifications?: { from: string; text: string }[]
  lines: ReelLine[]
}

/** Things that change the state and nothing else: no movement, no change of scene. */
export type QuietAction =
  | DialogueAction
  | { kind: 'wait'; ms: number }
  | { kind: 'setFlag'; flag: StoryFlag }
  | { kind: 'clearFlag'; flag: StoryFlag }
  | { kind: 'giveItem'; itemId: string }
  /** Negative takes it away; the wallet never goes below nothing. */
  | { kind: 'giveCash'; amount: number }
  | { kind: 'playSound'; sound: string }

/**
 * What can happen on a ride you do not choose: talk, a pause, a quiet change of
 * state. Nobody walks and nothing changes scene: you are sat on a bus.
 */
export type RideAction = QuietAction

/** One answer the player can give to a `choice`. */
export interface ChoiceOption {
  /** What the button says. Short: on a phone it is one line of a button. */
  label: string
  /**
   * Open only while these hold: enough cash to cover it, a debt to pay. A closed
   * option is shown greyed out, so the player sees the road they cannot take,
   * unless it is `hidden`. Every choice keeps one option with no conditions, so
   * there is always a way on.
   */
  conditions?: EventCondition[]
  /** Leave it off the list, rather than grey it out, while it is closed. */
  hidden?: boolean
  /**
   * What picking it does, in order — lines, flags, cash, a stake, a ride, a
   * table. The event carries on after the choice once these are done, unless
   * one of them sits you down at a table.
   */
  then: EventAction[]
}

/**
 * What happens, in order.
 *
 * Deliberately a small vocabulary. Every action here is something the game can
 * already do — the point is to be able to order them from content rather than to
 * grow a scripting language nobody can keep in their head.
 */
export type EventAction =
  | QuietAction
  /**
   * The player decides: two to four answers, each with what it leads to. The
   * consequence is written as flags a later beat reads, so a choice changes
   * more than the next line.
   */
  | { kind: 'choice'; speaker?: string; prompt: string; options: ChoiceOption[] }
  /**
   * A later beat remembering an earlier one: these actions if the conditions
   * hold now, those otherwise. How a decision made three towns ago is heard.
   */
  | { kind: 'if'; when: EventCondition[]; then: EventAction[]; else?: EventAction[] }
  /**
   * Somebody walks (or runs) to a tile, the way a person would go, and the beat
   * waits until they are there. `from` brings them on from a tile first — the
   * end of the street — when they were not here. `youFollow` has the player
   * walk a step behind them; `leaves` has them go once they arrive, through the
   * door or off the edge they walked to.
   */
  | {
      kind: 'moveNpc'
      characterId: string
      to: Spot
      from?: Tile
      pace?: Pace
      youFollow?: boolean
      leaves?: boolean
    }
  /** The player walks to a tile, without the keys. */
  | { kind: 'movePlayer'; to: Tile; pace?: Pace }
  | { kind: 'unlockCity'; cityId: string }
  | { kind: 'unlockTable'; tableId: string }
  | { kind: 'startTable'; tableId: string }
  | { kind: 'startPokerNight' }
  /** Put the player somewhere, with no bus and no door. `with` brings people along, beside you. */
  | { kind: 'teleport'; areaId: string; col: number; row: number; with?: string[] }
  /**
   * A ride on the 14 you do not choose: the bus, with `with` sat beside you and
   * `during` said on the way, no skip button, and off at the stop at the other
   * end. It costs the hour a ride across town costs, as the bus always does.
   */
  | {
      kind: 'ride'
      areaId: string
      col: number
      row: number
      caption?: string
      with?: string[]
      during?: RideAction[]
    }
  /**
   * A short film in front of the street: the televised final, the bathroom,
   * the commentators in their booth, the night out the back. The player turns
   * its lines like a text box and may skip the lot. Nothing is on the map while
   * it plays.
   */
  | { kind: 'reel'; title?: string; panels: ReelPanel[] }
  /**
   * A scripted scene the game draws with its own table and sprites rather than
   * a set: `bad-beat`, the opening's hand and the failing of the lights.
   */
  | { kind: 'cinematic'; id: CinematicId }
  /** Take a sponsor's stake on their usual terms, as their own menu would give it. */
  | { kind: 'takeStake'; sponsorId: string }
  /** Pay back everything owed to a sponsor. Nothing happens if you cannot cover it. */
  | { kind: 'repay'; sponsorId: string }
  | { kind: 'advancePeriod'; steps?: number }
  | { kind: 'advanceDay'; days?: number }
  | { kind: 'fade'; to: 'out' | 'in' }

/** Actions after which nothing else runs: the table takes over the screen. */
export const ENDS_EVENT = new Set<EventAction['kind']>(['startTable', 'startPokerNight'])

/** The lists of actions nested inside one: a choice's answers, an `if`'s two ways, what is said on a ride. */
export function branchesOf(action: EventAction): EventAction[][] {
  switch (action.kind) {
    case 'choice':
      return action.options.map((option) => option.then)
    case 'if':
      return action.else ? [action.then, action.else] : [action.then]
    case 'ride':
      return action.during ? [action.during] : []
    default:
      return []
  }
}

/** Every action in a list and in every branch inside it, in reading order. */
export function everyAction(actions: EventAction[]): EventAction[] {
  return actions.flatMap((action) => [action, ...branchesOf(action).flatMap(everyAction)])
}

/** Every condition an event asks: its own, each answer's, and each `if`'s. */
export function everyCondition(event: GameEvent): EventCondition[] {
  return [
    ...(event.conditions ?? []),
    ...everyAction(event.actions).flatMap((action) =>
      action.kind === 'choice'
        ? action.options.flatMap((option) => option.conditions ?? [])
        : action.kind === 'if'
          ? action.when
          : [],
    ),
  ]
}

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
    case 'canPay': {
      const owed = owedTo(state, condition.sponsorId)
      return owed > 0 && state.cash >= owed
    }
    case 'casino': {
      const list = condition.status === 'roomOpen' ? state.casino.roomOpen : state.casino.bossBeaten
      return list.includes(condition.cityId) === (condition.set ?? true)
    }
  }
}

/** Everything owed to one sponsor, across every stake of theirs still open. */
export function owedTo(state: GameState, sponsorId: string): number {
  return state.debts.filter((d) => d.sponsorId === sponsorId).reduce((sum, d) => sum + d.owed, 0)
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

  const casino = (cs: EventCondition[]) =>
    new Map(
      cs.flatMap((c) => (c.kind === 'casino' ? [[`${c.cityId}:${c.status}`, c.set ?? true] as const] : [])),
    )
  const casinoB = casino(cb)
  for (const [key, want] of casino(ca)) {
    if (casinoB.has(key) && casinoB.get(key) !== want) return false
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
    case 'finaleWon':
      return b.kind === 'finaleWon'
    case 'finaleLost':
      return b.kind === 'finaleLost'
    case 'tournamentWon':
      return b.kind === 'tournamentWon'
    case 'tournamentLost':
      return b.kind === 'tournamentLost'
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
 * Every place a beat moves the player into while it is still running — a
 * `teleport` or a `ride`, down every branch — with what is true at that moment:
 * the beat's own conditions, as changed by whatever it has done on the way.
 *
 * Walking into somewhere is a moment another beat can be written for, and a beat
 * that carries you there is still holding the screen when you arrive. Only one
 * of them can have it, so the two must be told apart like any other pair that
 * share a moment (see `arrivalClashes`). What the beat has done on the way
 * counts: a flag it set before the move separates it from a beat that needs the
 * flag clear. Anything whose effect cannot be followed exactly — cash, the
 * hour, debts, the chapter — stops being something to tell them apart by.
 */
export function arrivalsDuring(event: GameEvent): Array<{ areaId: string; conditions: EventCondition[] }> {
  const arrivals: Array<{ areaId: string; conditions: EventCondition[] }> = []
  // The beat is under way, so it has not happened yet.
  const start: EventCondition[] = [...(event.conditions ?? []), { kind: 'eventDone', eventId: event.id, done: false }]
  const unknown = (cs: EventCondition[], kinds: Array<EventCondition['kind']>) => cs.filter((c) => !kinds.includes(c.kind))
  const withFlag = (cs: EventCondition[], flag: StoryFlag, set: boolean): EventCondition[] => [
    ...cs.filter((c) => !(c.kind === 'flag' && c.flag === flag)),
    { kind: 'flag', flag, set },
  ]

  const follow = (actions: EventAction[], conditions: EventCondition[]): EventCondition[] | null => {
    let cs = conditions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const rest = actions.slice(i + 1)
      switch (action.kind) {
        case 'setFlag':
        case 'clearFlag':
          cs = withFlag(cs, action.flag, action.kind === 'setFlag')
          break
        case 'giveCash':
          cs = unknown(cs, ['cashAtLeast', 'cashBelow', 'canPay'])
          break
        case 'takeStake':
        case 'repay':
          cs = unknown(cs, ['cashAtLeast', 'cashBelow', 'canPay', 'debt', 'hunted', 'count'])
          break
        case 'advancePeriod':
        case 'advanceDay':
          cs = unknown(cs, ['period', 'dayAtLeast', 'debt', 'hunted', 'challenge'])
          break
        case 'unlockCity':
          cs = unknown(cs, ['chapter'])
          break
        case 'teleport':
          cs = unknown(cs, ['chapter', 'hunted'])
          arrivals.push({ areaId: action.areaId, conditions: cs })
          break
        case 'ride': {
          const said = follow(action.during ?? [], cs) ?? cs
          cs = unknown(said, ['chapter', 'hunted', 'period', 'debt'])
          arrivals.push({ areaId: action.areaId, conditions: cs })
          break
        }
        case 'choice':
          // Each answer, and then whatever follows the question.
          for (const option of action.options) follow([...option.then, ...rest], [...cs, ...(option.conditions ?? [])])
          return null
        case 'if': {
          follow([...action.then, ...rest], [...cs, ...action.when])
          // The other way: only a single flag can be turned round exactly.
          const [only] = action.when
          const otherwise =
            action.when.length === 1 && only.kind === 'flag' ? withFlag(cs, only.flag, !(only.set ?? true)) : cs
          follow([...(action.else ?? []), ...rest], otherwise)
          return null
        }
        case 'startTable':
        case 'startPokerNight':
          return null
      }
    }
    return cs
  }
  follow(event.actions, start)
  return arrivals
}

function waitsOnCasinoGoal(event: GameEvent): boolean {
  return (event.conditions ?? []).some((c) => c.kind === 'casino' && (c.set ?? true))
}

/**
 * Pairs that would fight over walking into somewhere: a beat that carries you
 * into an area, and a beat for walking into it that could be ready at the same
 * moment. The beat already holding the screen would win and the other would be
 * lost, so the content tests fail on it rather than let declaration order
 * decide.
 */
export function arrivalClashes(events: GameEvent[]): Array<[GameEvent, GameEvent]> {
  const clashes: Array<[GameEvent, GameEvent]> = []
  for (const carrier of events) {
    for (const arrival of arrivalsDuring(carrier)) {
      const underWay: GameEvent = { ...carrier, conditions: arrival.conditions, repeatable: true }
      for (const other of eventsSharing(events, { kind: 'enterArea', areaId: arrival.areaId })) {
        // A casino goal is only ever met at a table, and a beat that carries you
        // is not at one: whatever it carries you to, the goal is not newly met.
        if (waitsOnCasinoGoal(other)) continue
        if (other.id !== carrier.id && canBothFire(underWay, other)) clashes.push([carrier, other])
      }
    }
  }
  return clashes
}

/**
 * The refresher on offer before the first poker night: the commentators, still
 * on air during the blackout at Porto Lumina, put out an old tape of Hal's to
 * buy time. It covers the game as the tables here play it — hold'em: the hands,
 * the seats, the sizes of a bet, the bluff. Free, skippable, and never gates
 * anything; the paid lessons (`hal-first-lesson`) go further than this.
 */
const REFRESHER_TAPE: EventAction[] = [
  { kind: 'fade', to: 'out' },
  {
    kind: 'reel',
    title: 'Live from Porto Lumina',
    panels: [
      {
        scene: 'booth',
        ticker: 'TECHNICAL DIFFICULTY · PLEASE STAND BY',
        lines: [
          { who: 'Chip', text: 'Folks, the rig is still down, and the engineers tell me "ten minutes". They said that an hour ago.' },
          { who: 'Dr. Anand', text: 'The archive has sent over a tape. I am told it is educational. I am also told it is the only thing we have.' },
          { who: 'Chip', text: 'Hal\'s Hold\'em Handbook! Filmed in a rented hall, in a sweater he still owns. Roll it!' },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 1 · THE GAME',
        lines: [
          {
            who: 'hal',
            text: 'Hal: Welcome. Texas hold\'em. You get two cards of your own, face down: your hole cards.',
            show: { kind: 'board', hole: 'As Kd', board: '', note: 'YOUR HOLE CARDS. NOBODY ELSE SEES THEM.' },
          },
          {
            who: 'hal',
            text: 'Hal: Then cards go in the middle, face up, for everybody. Three first. That is the flop.',
            show: { kind: 'board', hole: 'As Kd', board: 'Ks 7c 2d', note: 'THE FLOP · KING OF SPADES PAIRS YOUR KING' },
          },
          {
            who: 'hal',
            text: 'Hal: A fourth card, the turn. A fifth, the river. There is a round of betting after every step.',
            show: { kind: 'board', hole: 'As Kd', board: 'Ks 7c 2d 9h 4s', note: 'THE TURN, THEN THE RIVER' },
          },
          {
            who: 'hal',
            text: 'Hal: Your hand is the best five cards out of those seven. Here: a pair of kings, ace kicker.',
            show: { kind: 'board', hole: 'As Kd', board: 'Ks 7c 2d 9h 4s', make: 'As Kd Ks 9h 7c', rank: 'Pair', note: 'THE BEST FIVE OF THE SEVEN PLAY' },
          },
          {
            who: 'hal',
            text: 'Hal: Use both of your cards, one of them, or neither. Here the board is a royal flush and everyone splits it.',
            show: { kind: 'board', hole: '2c 3d', board: 'As Ks Qs Js 10s', make: 'As Ks Qs Js 10s', rank: 'Straight Flush', note: 'PLAYING THE BOARD' },
          },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 2 · THE HANDS',
        lines: [
          {
            who: 'hal',
            text: 'Hal: Best of all, the straight flush: five in a row, one suit. Ace-high is the royal flush. Nobody beats it.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'ROYAL FLUSH', sub: 'ten to ace', cards: 'As Ks Qs Js 10s', rank: 'Straight Flush' },
                { title: 'STRAIGHT FLUSH', sub: 'run of one suit', cards: '9h 8h 7h 6h 5h', rank: 'Straight Flush' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: Four of a kind. Then the full house: three of one rank and a pair of another.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'FOUR OF A KIND', sub: 'four of one rank', cards: '9s 9h 9d 9c Kd', make: '9s 9h 9d 9c', rank: 'Four of a Kind' },
                { title: 'FULL HOUSE', sub: 'three and two', cards: 'Kd Kh Ks 4c 4d', rank: 'Full House' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: A flush is any five of one suit. A straight is five in a row, any suits. The flush is the better one.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'FLUSH', sub: 'five of one suit', cards: 'Ah Jh 8h 6h 3h', rank: 'Flush', verdict: 'wins' },
                { title: 'STRAIGHT', sub: 'five in a row', cards: '9c 8d 7h 6s 5c', rank: 'Straight', verdict: 'loses' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: The ace plays high or low. Ace to five is the smallest straight, the wheel. Still a straight.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'BROADWAY', sub: 'ace high', cards: 'As Kh Qd Jc 10h', rank: 'Straight' },
                { title: 'THE WHEEL', sub: 'ace low', cards: 'Ah 2c 3d 4s 5h', rank: 'Straight' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: Three of a kind. Two pair. One pair. Count the pairs, and watch the cards left over.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'THREE OF A KIND', sub: 'three alike', cards: '7s 7h 7d Kc 2c', make: '7s 7h 7d', rank: 'Three of a Kind' },
                { title: 'TWO PAIR', sub: 'two and two', cards: 'Jh Jd 4s 4c Ad', make: 'Jh Jd 4s 4c', rank: 'Two Pair' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: One pair. And with nothing at all, your highest card plays. That is the bottom of the ladder.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'ONE PAIR', sub: 'two alike', cards: 'Qs Qd 9h 6c 3d', make: 'Qs Qd', rank: 'Pair' },
                { title: 'HIGH CARD', sub: 'the ace plays', cards: 'Ac Jd 8h 5s 3c', make: 'Ac', rank: 'High Card' },
              ],
            },
          },
          {
            who: 'hal',
            text: 'Hal: Same hand on both sides? Then the next-highest card, the kicker, decides it. Kickers break more hearts than bluffs do.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'PAIR OF KINGS', sub: 'ace kicker', cards: 'Ks Kh Ad 8d 5c', make: 'Ks Kh Ad', rank: 'Pair', verdict: 'wins' },
                { title: 'PAIR OF KINGS', sub: 'queen kicker', cards: 'Kc Kd Qd 8h 5s', make: 'Kc Kd Qd', rank: 'Pair', verdict: 'loses' },
              ],
            },
          },
        ],
      },
      {
        scene: 'booth',
        ticker: 'STILL OFF AIR · PLEASE STAND BY',
        lines: [
          { who: 'Dr. Anand', text: 'For viewers keeping score: a flush beats a straight, and a full house beats a flush. People get that wrong on television.' },
          { who: 'Chip', text: 'And the lights are STILL out, folks! Back to Hal!' },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 3 · POSITION',
        lines: [
          {
            who: 'hal',
            text: 'Hal: A marker called the button moves one seat to the left every hand. Whoever has it deals.',
            show: { kind: 'seats', mark: ['btn'], note: 'THE BUTTON MOVES LEFT EACH HAND' },
          },
          {
            who: 'hal',
            text: 'Hal: The two seats after it post forced bets, the blinds, so there is always something to win.',
            show: { kind: 'seats', mark: ['sb', 'bb'], note: 'SMALL BLIND THEN BIG BLIND: FORCED BETS' },
          },
          {
            who: 'hal',
            text: 'Hal: Before the flop, the seat after the big blind starts. The blinds act last.',
            show: { kind: 'seats', order: 'preflop', note: 'BEFORE THE FLOP · NUMBERS = ORDER OF PLAY' },
          },
          {
            who: 'hal',
            text: 'Hal: After the flop it flips. The small blind starts, and the button acts last, every round.',
            show: { kind: 'seats', order: 'flop', mark: ['btn'], note: 'AFTER THE FLOP · THE BUTTON ACTS LAST' },
          },
          {
            who: 'hal',
            text: 'Hal: Acting last is worth more than any card. You see what everyone does before you decide.',
            show: { kind: 'seats', zones: true, note: 'THE LATER YOUR SEAT, THE MORE HANDS YOU PLAY' },
          },
          {
            who: 'hal',
            text: 'Hal: So early, play only the strong hands. From the button, you can play more.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'EARLY SEAT', sub: 'strong hands', cards: 'As Ah' },
                { title: 'THE BUTTON', sub: 'play wider', cards: '9h 8h' },
              ],
              note: 'A HAND IS WORTH MORE FROM A LATE SEAT',
            },
          },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 4 · BETTING',
        lines: [
          {
            who: 'hal',
            text: 'Hal: Everything people bet goes to the middle: the pot. The winner takes it.',
            show: { kind: 'bets', pot: 6, bets: [], note: 'THE POT · 6 CHIPS' },
          },
          {
            who: 'hal',
            text: 'Hal: On your turn you fold, check if nobody has bet, call to match a bet, or raise it.',
            show: {
              kind: 'bets',
              pot: 6,
              bets: [
                { label: 'BET', chips: 3, tone: 'bet' },
                { label: 'CALL', chips: 3, tone: 'call' },
                { label: 'RAISE TO', chips: 9, tone: 'raise' },
              ],
              note: 'A RAISE MUST BE AT LEAST THE BET BEFORE IT',
            },
          },
          {
            who: 'hal',
            text: 'Hal: Size a bet against the pot. A third is small and cheap. Half to two-thirds is the bet you make most.',
            show: {
              kind: 'bets',
              pot: 6,
              bets: [
                { label: '1/3 POT', chips: 2, tone: 'bet' },
                { label: '1/2 POT', chips: 3, tone: 'bet' },
                { label: '2/3 POT', chips: 4, tone: 'bet' },
              ],
              note: 'SMALL BETS: CHEAP, AND "I MIGHT HAVE IT"',
            },
          },
          {
            who: 'hal',
            text: 'Hal: A full pot is the big one. It makes a draw pay the most. More than the pot is for when you are not afraid.',
            show: {
              kind: 'bets',
              pot: 6,
              bets: [
                { label: 'POT', chips: 6, tone: 'raise' },
                { label: 'OVERBET', chips: 9, tone: 'raise' },
              ],
              note: 'ALL-IN = ALL YOU HAVE · NEVER LOSE MORE',
            },
          },
          {
            who: 'hal',
            text: 'Hal: Do the sum on a call. Half the pot costs you three to win nine: you need to win one time in four.',
            show: {
              kind: 'bets',
              pot: 6,
              bets: [
                { label: 'THEIR BET', chips: 3, tone: 'bet' },
                { label: 'YOUR CALL', chips: 3, tone: 'call' },
              ],
              note: 'PAY 3 TO WIN 9 · YOU NEED TO WIN 1 IN 4',
            },
          },
          {
            who: 'hal',
            text: 'Hal: Against a full-pot bet you need one in three. The price of the call decides if it is a good call.',
            show: {
              kind: 'bets',
              pot: 6,
              bets: [
                { label: 'THEIR BET', chips: 6, tone: 'raise' },
                { label: 'YOUR CALL', chips: 6, tone: 'call' },
              ],
              note: 'PAY 6 TO WIN 12 · YOU NEED TO WIN 1 IN 3',
            },
          },
        ],
      },
      {
        scene: 'booth',
        ticker: 'STILL OFF AIR · PLEASE STAND BY',
        lines: [
          { who: 'Dr. Anand', text: 'He has just described pot odds. I have waited eleven years to hear someone do it without a whiteboard.' },
          { who: 'Chip', text: 'A natural, folks! Hal, take us home!' },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 5 · THE BLUFF',
        lines: [
          {
            who: 'hal',
            text: 'Hal: A bluff is a bet with a worse hand, to make a better one fold. Here you hold nothing. The board shows an ace.',
            show: { kind: 'board', hole: 'Qc 5d', board: 'As 8d 3c', note: 'NOTHING IN HAND · THE BOARD SHOWS AN ACE' },
          },
          {
            who: 'hal',
            text: 'Hal: A bluff is a story. If you have the ace, you bet the flop, you bet the turn, and you bet the river. So tell it.',
            show: { kind: 'board', hole: 'Qc 5d', board: 'As 8d 3c Kd 2h', rank: 'High Card', note: 'THE STORY: "I HAVE THE ACE"' },
          },
          {
            who: 'hal',
            text: 'Hal: Ask: what would I have, to play it this way? If the answer is a strong hand, bet. If not, give it up.',
            show: { kind: 'board', hole: 'Qc 5d', board: 'As 8d 3c Kd 2h', rank: 'High Card', note: 'WOULD A REAL ACE PLAY IT LIKE THIS?' },
          },
          {
            who: 'hal',
            text: 'Hal: Bluff the man who can fold. Never the calling station, who calls with anything. He does not look at his cards.',
            show: {
              kind: 'hands',
              hands: [
                { title: 'THE FOLDER', sub: 'bluff him', cards: '7c 2d', verdict: 'wins' },
                { title: 'CALLING STATION', sub: 'do not bluff', cards: 'Js 4h', verdict: 'loses' },
              ],
              note: 'BLUFF THE ONES WHO CAN LAY A HAND DOWN',
            },
          },
          {
            who: 'hal',
            text: 'Hal: Better is the semi-bluff. You bet a hand that is not there yet. Four hearts, and a straight draw as well.',
            show: { kind: 'board', hole: '9h 8h', board: 'Kh 7h 2c', make: '9h 8h Kh 7h', rank: 'High Card', note: 'FLUSH DRAW + STRAIGHT DRAW · 15 OUTS' },
          },
          {
            who: 'hal',
            text: 'Hal: If they fold, you win now. If they call, you can still hit. Fifteen cards in the deck help you.',
          },
          {
            who: 'hal',
            text: 'Hal: And watch them. Everybody has a tell: a held breath, a shaking hand, chips stacked too carefully. Collect them.',
          },
        ],
      },
      {
        scene: 'tape',
        ticker: 'TAPE 6 · LAST THINGS',
        lines: [
          {
            who: 'hal',
            text: 'Hal: Fold more than you think you should. Most hands are not worth the money to see them. This is the worst one.',
            show: { kind: 'board', hole: '7c 2d', board: '', note: 'SEVEN-DEUCE · THE WORST START · FOLD IT' },
          },
          {
            who: 'hal',
            text: 'Hal: Never play money you cannot lose. And when you lose a hand you played right, go on to the next as if nothing happened.',
          },
          {
            who: 'hal',
            text: 'Hal: That is the lot. Go and play, and bring me the stories. That is the only fee I charge on this tape.',
          },
        ],
      },
      {
        scene: 'booth',
        ticker: 'POKER LEGENDS · THE LIGHTS RETURN',
        lines: [
          { who: 'Chip', text: 'And that was Hal, folks! A legend, if you only count the people who listened!' },
          { who: 'Dr. Anand', text: 'I took notes. For the record, I am the only one in this booth who did.' },
        ],
      },
    ],
  },
  { kind: 'fade', to: 'in' },
  {
    kind: 'dialogue',
    speaker: 'marcus',
    lines: [
      'Marcus: Hal made that? In a sweater like that? I have watched that tape on and off since I was twenty-six.',
      'Marcus: Position, pot odds, do not bluff the man who does not look. It is all there. Now deal.',
    ],
  },
]

/**
 * Asked at Marcus's table before the first deal: sit down, or get the refresher
 * first. Either way the event carries on to the deal after it.
 */
const REFRESHER_CHOICE: EventAction = {
  kind: 'choice',
  speaker: 'marcus',
  prompt: 'Do you want a refresher on how the game is played before we deal?',
  options: [
    {
      label: 'Deal me in',
      then: [{ kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Confident. I like it. It will not last.'] }],
    },
    {
      label: 'Give me a refresher',
      then: [
        {
          kind: 'dialogue',
          speaker: 'marcus',
          lines: ['Marcus: Sure, sure. I taped the night the lights went out at your final. They filled the time with this.'],
        },
        ...REFRESHER_TAPE,
      ],
    },
  ],
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
      REFRESHER_CHOICE,
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
  // The opening. The first time you step out of your door, Dana runs up the
  // street to catch you, walks you to the 14 and rides it with you to Marcus's
  // block, so the run starts at his door rather than wherever you wandered.
  // Anybody who gets as far as the depot without her (a save from before this
  // was written) is met there instead. docs/STORYBOARD.md, Act 0.
  {
    id: 'dana-walks-you-to-the-bus',
    about:
      'The opening: Dana runs to catch you outside your door, walks you to the depot and rides the 14 with ' +
      'you to Marcus’s door — or, if you have a stop to make first, goes on ahead to wait at the bus stop. ' +
      'How you answer her is remembered (`dana-reveal`).',
    trigger: { kind: 'enterArea', areaId: 'basin', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night', done: false },
      { kind: 'flag', flag: 'metDana', set: false },
      { kind: 'flag', flag: 'danaAtTheStop', set: false },
      { kind: 'period', period: ['morning', 'afternoon', 'evening'] },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'dialogue', lines: ['Somebody is calling after you from the end of the street.'] },
      { kind: 'moveNpc', characterId: 'dana', from: { col: 27, row: 7 }, to: 'player', pace: 'run' },
      { kind: 'setFlag', flag: 'metDana' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: You walk fast for somebody with nowhere to be.',
          'Dana: Dana. From the laundromat. Marcus asked me to make sure you get to his tonight.',
          'Dana: He says you will walk it, get lost, and turn up at midnight. He has set out chairs.',
          'Dana: I watched you play on Tuesday. You raised the river with nothing.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'dana',
        prompt: 'What do you say to her?',
        options: [
          {
            label: 'Why were you watching?',
            then: [
              { kind: 'setFlag', flag: 'askedDanaWhy' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Somebody likes to read about the games. I write them down.'] },
            ],
          },
          {
            label: 'Then watch tonight',
            then: [
              { kind: 'setFlag', flag: 'toldDanaToWatch' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Mm. I will.'] },
            ],
          },
          {
            label: 'Mind your own business',
            then: [
              { kind: 'setFlag', flag: 'brushedOffDana' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: This is my business. Come on.'] },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: The 14 goes from the depot, the far end of Seventh. Walk with me.',
          'Dana: Or go and win Patel his dollar back first. The busker has had it off him eleven mornings running.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'dana',
        prompt: 'The bus now, or Patel’s first?',
        options: [
          {
            label: 'Walk with her',
            then: [
              { kind: 'moveNpc', characterId: 'dana', to: { col: 26, row: 7 }, youFollow: true },
              { kind: 'fade', to: 'out' },
              { kind: 'teleport', areaId: 'depot', col: 6, row: 2, with: ['dana'] },
              { kind: 'fade', to: 'in' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Back row, on the left. You see who gets on before they see you.'] },
              {
                kind: 'ride',
                areaId: 'eastgate',
                col: 9,
                row: 13,
                with: ['dana'],
                caption: 'Dana takes the window seat and watches the town go past like she is counting it.',
                during: [
                  {
                    kind: 'dialogue',
                    speaker: 'dana',
                    lines: [
                      'Dana: Marcus thinks he is going to win tonight. He is not.',
                      'Dana: Everything on the table, winner takes the lot. His rule.',
                      'Dana: Win it, and you have a bankroll. Lose it, and he deals you in again. He always does.',
                    ],
                  },
                ],
              },
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: ['Dana: Marcus is the middle door, up the street. Walk with me.'],
              },
              {
                kind: 'moveNpc',
                characterId: 'dana',
                to: { col: 11, row: 5 },
                youFollow: true,
              },
              { kind: 'dialogue', speaker: 'dana', lines: [
                'Dana: Middle door. He has been setting out chairs since lunch.',
                'Dana: After you. Wipe your feet. He will notice.',
              ] },
              { kind: 'fade', to: 'out' },
              { kind: 'teleport', areaId: 'marcus-house', col: 7, row: 9, with: ['dana'] },
              { kind: 'fade', to: 'in' },
              {
                kind: 'dialogue',
                lines: ['Inside, the front room is lit, and somebody is shuffling a deck. Badly.'],
              },
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: ['Dana: Table is this way. Stay close. The carpet bites.'],
              },
              {
                kind: 'moveNpc',
                characterId: 'dana',
                // Her chair at the table: the one her schedule keeps her in tonight.
                to: { col: 9, row: 5 },
                youFollow: true,
              },
              {
                kind: 'dialogue',
                speaker: 'marcus',
                lines: [
                  'Marcus: There they are! Sit, sit. Mind the rug, it is load-bearing.',
                  'Marcus: I have snacks. Pretzels. The good pretzels, the ones I told Patel were for a funeral.',
                ],
              },
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: Marcus, you told Mr. Patel the funeral was yours.',
                  'Marcus: It will be, if I lose again.',
                  'Dana: You lose every Friday.',
                  'Marcus: That is called consistency. It is a quality.',
                ],
              },
              {
                kind: 'dialogue',
                speaker: 'marcus',
                lines: [
                  'Marcus: House rules. Everything on the table, winner takes the lot. If anyone cries, they cry quietly.',
                  'Marcus: Deal them in. Dana, you are in the big chair.',
                  'Dana: I am always in the big chair.',
                ],
              },
              REFRESHER_CHOICE,
              { kind: 'startPokerNight' },
            ],
          },
          {
            // A few minutes on your own before the bus: Mr Patel's dollar
            // (`errand-patel`), and Dana waiting at the stop (`dana-waits-at-the-stop`).
            label: 'Patel’s first',
            then: [
              { kind: 'setFlag', flag: 'danaAtTheStop' },
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: Then I will be at the stop. Patel’s is the first door on Seventh; the busker is outside it.',
                  'Dana: Do not make me come and find you twice.',
                ],
              },
              { kind: 'moveNpc', characterId: 'dana', to: { col: 27, row: 7 }, leaves: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dana-at-the-depot',
    about:
      'The opening, for anybody who reached the depot before Dana found them: she is waiting at the stop, ' +
      'and rides the 14 with you to Marcus’s door. Walking to his before the opening cannot get past here.',
    trigger: { kind: 'enterArea', areaId: 'depot', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night', done: false },
      { kind: 'flag', flag: 'metDana', set: false },
      { kind: 'period', period: ['morning', 'afternoon', 'evening'] },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'dana', from: { col: 7, row: 2 }, to: 'player', pace: 'run' },
      { kind: 'setFlag', flag: 'metDana' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: There you are. Marcus said you would walk it.',
          'Dana: Dana. From the laundromat. He asked me to put you on the 14, so I am putting you on the 14.',
          'Dana: I watched you play on Tuesday. You raised the river with nothing.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'dana',
        prompt: 'What do you say to her?',
        options: [
          {
            label: 'Why were you watching?',
            then: [
              { kind: 'setFlag', flag: 'askedDanaWhy' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Somebody likes to read about the games. I write them down.'] },
            ],
          },
          {
            label: 'Then watch tonight',
            then: [
              { kind: 'setFlag', flag: 'toldDanaToWatch' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Mm. I will.'] },
            ],
          },
          {
            label: 'Mind your own business',
            then: [
              { kind: 'setFlag', flag: 'brushedOffDana' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: This is my business. Come on.'] },
            ],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Here it comes.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 7, row: 2 }, youFollow: true },
      {
        kind: 'ride',
        areaId: 'eastgate',
        col: 9,
        row: 13,
        with: ['dana'],
        caption: 'Dana takes the window seat and watches the town go past like she is counting it.',
        during: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: Marcus thinks he is going to win tonight. He is not.',
              'Dana: Everything on the table, winner takes the lot. His rule.',
              'Dana: Win it, and you have a bankroll. Lose it, and he deals you in again. He always does.',
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: ['Dana: Marcus is the middle door, up the street. Walk with me.'],
      },
      {
        kind: 'moveNpc',
        characterId: 'dana',
        to: { col: 11, row: 5 },
        youFollow: true,
      },
      { kind: 'dialogue', speaker: 'dana', lines: [
        'Dana: Middle door. He has been setting out chairs since lunch.',
        'Dana: After you. Wipe your feet. He will notice.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'marcus-house', col: 7, row: 9, with: ['dana'] },
      { kind: 'fade', to: 'in' },
      {
        kind: 'dialogue',
        lines: ['Inside, the front room is lit, and somebody is shuffling a deck. Badly.'],
      },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: ['Dana: Table is this way. Stay close. The carpet bites.'],
      },
      {
        kind: 'moveNpc',
        characterId: 'dana',
        // Her chair at the table: the one her schedule keeps her in tonight.
        to: { col: 9, row: 5 },
        youFollow: true,
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: There they are! Sit, sit. Mind the rug, it is load-bearing.',
          'Marcus: I have snacks. Pretzels. The good pretzels, the ones I told Patel were for a funeral.',
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: Marcus, you told Mr. Patel the funeral was yours.',
          'Marcus: It will be, if I lose again.',
          'Dana: You lose every Friday.',
          'Marcus: That is called consistency. It is a quality.',
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: House rules. Everything on the table, winner takes the lot. If anyone cries, they cry quietly.',
          'Marcus: Deal them in. Dana, you are in the big chair.',
          'Dana: I am always in the big chair.',
        ],
      },
      REFRESHER_CHOICE,
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'dana-waits-at-the-stop',
    about:
      'The opening, when you told Dana you had a stop to make first: she is at the bus stop when you reach the ' +
      'depot, says what she heard about Patel’s dollar, and rides the 14 with you to Marcus’s door.',
    trigger: { kind: 'enterArea', areaId: 'depot', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night', done: false },
      { kind: 'flag', flag: 'metDana' },
      { kind: 'flag', flag: 'danaAtTheStop' },
      { kind: 'period', period: ['morning', 'afternoon', 'evening'] },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      // Where her schedule has her while she waits (characters.ts, Dana's chapters).
      { kind: 'moveNpc', characterId: 'dana', from: { col: 8, row: 2 }, to: 'player' },
      {
        kind: 'if',
        when: [{ kind: 'eventDone', eventId: 'errand-patel-done' }],
        then: [
          {
            kind: 'if',
            when: [{ kind: 'flag', flag: 'errandPatelRaised' }],
            then: [
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: Four sevens. You had him beat, and you raised a man holding nothing so he could call you.',
                  'Dana: Marcus does that. Tonight, do not do what Marcus does.',
                ],
              },
            ],
            else: [
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: The busker is telling all of Seventh you called him with two sevens and a straight face.',
                  'Dana: Patel came out from behind the counter to watch. He has not done that in nine years.',
                ],
              },
            ],
          },
        ],
        else: [
          {
            kind: 'if',
            when: [{ kind: 'eventDone', eventId: 'errand-patel-ask' }],
            then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: Patel’s dollar still in your pocket? It keeps. Marcus does not.'] }],
            else: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: The long way round. Good. Now you know where everything is.'] }],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Here it comes. Back row, on the left. You see who gets on before they see you.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 7, row: 2 }, youFollow: true },
      {
        kind: 'ride',
        areaId: 'eastgate',
        col: 9,
        row: 13,
        with: ['dana'],
        caption: 'Dana takes the window seat and watches the town go past like she is counting it.',
        during: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: Marcus thinks he is going to win tonight. He is not.',
              'Dana: Everything on the table, winner takes the lot. His rule.',
              'Dana: Win it, and you have a bankroll. Lose it, and he deals you in again. He always does.',
            ],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Marcus is the middle door, up the street. Walk with me.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 11, row: 5 }, youFollow: true },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: After you. Wipe your feet. He will notice.'] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'marcus-house', col: 7, row: 9, with: ['dana'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['Inside, the front room is lit, and somebody is shuffling a deck. Badly.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 9, row: 5 }, youFollow: true },
      {
        kind: 'if',
        when: [{ kind: 'eventDone', eventId: 'errand-patel-done' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'marcus',
            lines: [
              'Marcus: There they are! Patel rang. Patel has never rung anybody. He says you took the busker.',
              'Marcus: I am a little scared of you now. Sit, sit. Mind the rug, it is load-bearing.',
            ],
          },
        ],
        else: [
          {
            kind: 'dialogue',
            speaker: 'marcus',
            lines: [
              'Marcus: There they are! Sit, sit. Mind the rug, it is load-bearing.',
              'Marcus: I have snacks. Pretzels. The good pretzels, the ones I told Patel were for a funeral.',
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: House rules. Everything on the table, winner takes the lot. If anyone cries, they cry quietly.',
          'Marcus: Deal them in. Dana, you are in the big chair.',
          'Dana: I am always in the big chair.',
        ],
      },
      REFRESHER_CHOICE,
      { kind: 'startPokerNight' },
    ],
  },
  {
    id: 'dana-takes-your-measure',
    about:
      'Dana has been watching you play. Costs nothing and gives nothing — she is ' +
      'here to make the town feel like somewhere you are known. A run now hears this straight after the ' +
      'game (`dana-walks-you-home`) and is in Silver Creek by the next afternoon; this is for saves from before.',
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
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'brushedOffDana' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: My own business, you said. You were my business tonight.'] }],
        else: [
          {
            kind: 'if',
            when: [{ kind: 'flag', flag: 'toldDanaToWatch' }],
            then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You told me to watch. I did. So did somebody else, through me.'] }],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: I will be around.'] },
    ],
  },
  {
    id: 'marcus-sends-you-off',
    about:
      'The casino nudge. Marcus, cleaned out and proud, sends you to Silver Creek — ' +
      'and plants the penthouse as the thing at the top of the ladder. A run now hears this in ' +
      '`dana-walks-you-home` and `marcus-rides-out-with-you`; this is for saves that won before those.',
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
  // The night of the first game, and the morning after. Straight after you win,
  // Marcus and Dana make their excuses and tell you which bus is next; Dana
  // walks you home; in the morning Marcus is on your step and rides the 14 out
  // to Silver Creek with you. Both fire on finding yourself there (`onLoad`),
  // so getting up from the table starts the first and a reload in the middle of
  // either starts it again. docs/STORYBOARD.md, Act 0.
  {
    id: 'dana-walks-you-home',
    about:
      'Straight after you win the first poker night: Marcus and Dana praise your play and make excuses for ' +
      'their own, tell you the 14 runs out to Silver Creek for nothing, and Dana walks you home to sleep.',
    trigger: { kind: 'enterArea', areaId: 'marcus-house', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'apartment' },
      // The hours he is home, which are the hours his game is on.
      { kind: 'period', period: ['afternoon', 'evening', 'night'] },
      // A save that won before this was written, and has heard his send-off.
      { kind: 'eventDone', eventId: 'marcus-sends-you-off', done: false },
    ],
    actions: [
      // Getting up puts you back in the doorway; the win happened at the table,
      // where Dana is, so you are put back in your chair rather than her running
      // the length of the room to you.
      { kind: 'teleport', areaId: 'marcus-house', col: 9, row: 6 },
      { kind: 'wait', ms: 400 },
      { kind: 'dialogue', lines: ['The last chip slides across. Marcus stares at it like it owes him rent.'] },
      { kind: 'moveNpc', characterId: 'marcus', to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: That is everything. Mine, and Dana’s. You played that like you had done it for years.',
          'Marcus: For the record, my cards were cold all night. Nobody can play cold cards.',
        ],
      },
      // From her chair at the table, where her schedule has her tonight; `from`
      // brings her on there for a save that never met her on the way.
      { kind: 'moveNpc', characterId: 'dana', from: { col: 9, row: 5 }, to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: His cards were fine. He played them like they were on fire.',
          'Dana: I would have had you on the last hand. I was watching you instead of my cards.',
        ],
      },
      // What you said to her on the 14 (`dana-walks-you-to-the-bus`).
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'brushedOffDana' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: My own business, you said. You were my business tonight.'] }],
        else: [
          {
            kind: 'if',
            when: [{ kind: 'flag', flag: 'toldDanaToWatch' }],
            then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You told me to watch. I did. So did somebody else, through me.'] }],
            else: [
              {
                kind: 'if',
                when: [{ kind: 'flag', flag: 'askedDanaWhy' }],
                then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: Somebody is going to enjoy reading about tonight.'] }],
              },
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Right. You cannot take my money every Friday. I will run out of furniture.',
          'Marcus: Silver Creek. The casino out on the reservation road. The 14 runs there from the depot, and the fare is nothing.',
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: A hundred buys a seat at the low-stakes table. You just won fifteen.'] },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: I am putting you on that bus myself. First thing tomorrow.'] },
      // The game ran late, whenever it started.
      {
        kind: 'if',
        when: [{ kind: 'period', period: 'afternoon' }],
        then: [{ kind: 'advancePeriod', steps: 2 }],
        else: [{ kind: 'if', when: [{ kind: 'period', period: 'evening' }], then: [{ kind: 'advancePeriod' }] }],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Come on. I will walk you home before he cries.'] },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: I am not crying. The cards are dusty.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 7, row: 9 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'basin', col: 5, row: 4, with: ['dana'] },
      { kind: 'fade', to: 'in' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: This is you. Sleep. Marcus has set two alarms, which frightens me.',
          'Dana: I will be around.',
        ],
      },
      // Set before you go in, so the receipt under the door (`rent-receipt`,
      // for coming home later) is told apart from coming home tonight.
      { kind: 'setFlag', flag: 'marcusSeesYouOff' },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'home', col: 6, row: 7 },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['You lie down meaning to count it again. You get as far as four hundred.'] },
      { kind: 'fade', to: 'out' },
      { kind: 'advanceDay' },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['Morning. Somebody is hammering on your door.'] },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: I can hear you not getting up! Coat! Bus!'] },
    ],
  },
  {
    id: 'marcus-rides-out-with-you',
    about:
      'The morning after the first game: Marcus is on your step, rides the 14 out to Silver Creek with you, ' +
      'tells you the Porto Lumina story on the way, and walks you into the casino to the low-stakes table.',
    trigger: { kind: 'enterArea', areaId: 'basin', onLoad: true },
    conditions: [
      // Said out loud, though the walk home already needed it: it is what tells
      // this apart from the opening on this street and at the depot.
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'flag', flag: 'marcusSeesYouOff' },
      { kind: 'eventDone', eventId: 'dana-walks-you-home' },
      { kind: 'chapter', cityId: 'apartment' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'marcus', from: { col: 9, row: 6 }, to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Finally. Your neighbour has been timing me.',
          'Marcus: I told your landlord on the stairs: rent is on my tab till you are back. Do not argue.',
          'Marcus: I said I would put you on the bus. I am getting on it with you.',
        ],
      },
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 26, row: 7 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'depot', col: 6, row: 2, with: ['marcus'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Same 14. We just do not get off at Eastgate.'] },
      {
        kind: 'ride',
        areaId: 'sc-street',
        col: 26,
        row: 12,
        with: ['marcus'],
        caption: 'Marcus has brought sandwiches. He hands you one when the town runs out.',
        during: [
          {
            kind: 'dialogue',
            speaker: 'marcus',
            lines: [
              'Marcus: You know the Porto Lumina story? A woman lives in a penthouse over the casino.',
              'Marcus: Every so often she puts it on the table, heads up. Four years. Nobody has taken it.',
              'Marcus: I am not saying it is you. I am saying I want to be at the rail if it is.',
            ],
          },
          { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: She came through Basin once, years back. Sat at my kitchen table, won, and left her watch under the sugar bowl. I have kept it.'] },
          { kind: 'setFlag', flag: 'clueWatch' },
        ],
      },
      { kind: 'dialogue', lines: ['Silver Creek. A casino at the end of the reservation road, and a dollar-two game inside it.'] },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Smell that? Carpet and cigarettes. Real poker.'] },
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 16, row: 5 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'sc-floor', col: 20, row: 19, with: ['marcus'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Pit boss, top left. He seats the low-stakes table. A hundred to sit.'] },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Now the part that matters. Lou Brannigan owns this place, and he has a private room out back.',
          'Marcus: He will only play someone who has taken money off his floor. Win $400 at the poker tables here and the door opens.',
          'Marcus: It is profit, not chips. Your winnings minus your losses, added up over every sitting.',
          'Marcus: And it only counts once you have stood up and left the table. Win big mid-session and it does not show until you cash out.',
          'Marcus: Slots and craps do not count. Poker only. Top left of your screen keeps the tally.',
          'Marcus: Some tables have a night, when somebody worth watching turns up. The menu’s This week page lists them. The Book of Reads next to it is where you write down what people give away.',
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'cashAtLeast', amount: 600 }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'marcus',
            lines: ['Marcus: Six hundred buys the riverboat upriver. You have that, so just do not lose it.'],
          },
        ],
        else: [{ kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Get to six hundred and the riverboat upriver will have you.'] }],
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: I am getting the 14 home before the slots get my lunch money.',
          'Marcus: Go and be a story I can tell.',
        ],
      },
      { kind: 'clearFlag', flag: 'marcusSeesYouOff' },
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 20, row: 21 }, leaves: true },
      { kind: 'dialogue', lines: ['The low-stakes table is top left. The pit boss is waiting to seat you.'] },
      { kind: 'wait', ms: 400 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part one',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  'Folks, while the techs find the fuse box — the producers have asked us to ' +
                  'run the package. "The Road to the Final."',
              },
              {
                who: 'Dr. Anand',
                text:
                  'It is a retrospective. We have forty minutes of footage and one working ' +
                  'light.',
              },
              {
                who: 'Chip',
                text:
                  'And what a road, Doctor! It starts in a kitchen. A KITCHEN. A man named ' +
                  'Marcus, a bag of chips, and the rent due in nine days!',
              },
              {
                who: 'Dr. Anand',
                text: 'Technically the rent was due in ten. The producers rounded for drama.',
              },
              {
                who: 'Chip',
                text:
                  'Our player beats the table, takes the whole pot, and the next morning gets ' +
                  'on a bus with a man who has apparently been crying since breakfast.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'I would like it noted that the bus is called "the 14". It is not a metaphor. ' +
                  'I checked.',
              },
            ],
          },
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
    about: 'Arriving at Silver Creek: what the table costs, and the bankroll that buys the boat. Then you walk in to its table.',
    trigger: { kind: 'enterArea', areaId: 'sc-street' },
    // For anybody who got here on their own. Marcus brings you off the bus with
    // the flag set and says all this himself (`marcus-rides-out-with-you`).
    conditions: [
      { kind: 'flag', flag: 'marcusSeesYouOff', set: false },
      { kind: 'eventDone', eventId: 'marcus-rides-out-with-you', done: false },
    ],
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
      // "Let's go" means in: off the last line you walk to the door of the casino
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 16, row: 5 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'sc-floor', col: 20, row: 20 },
      { kind: 'fade', to: 'in' },
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
          'Ray: And if you are ever short, my sister Loretta at the Sand Dollar has work. Menu, then Jobs, keeps the list.',
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'eventDone', eventId: 'marcus-rides-out-with-you' }],
        then: [{ kind: 'dialogue', speaker: 'ray', lines: ['Ray: Saw your friend walk you in. Overalls. Hang on to him. This room eats friends.'] }],
      },
      {
        kind: 'dialogue',
        speaker: 'ray',
        lines: [
          'Ray: There was a girl, years back. Bought her first stack with her mother’s ring, and lost it twice in one night.',
          'Ray: Third time she did not lose. Somebody had paid for the third stack. A Mr. W. I never saw his face.',
        ],
      },
      { kind: 'setFlag', flag: 'clueRing' },
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
      { kind: 'setFlag', flag: 'scoutedDolores' },
      { kind: 'wait', ms: 300 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part two',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  'Silver Creek! Carpet, cigarette smoke and a man named Ray who has been "due" ' +
                  'since the Carter administration.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Ray is a textbook calling station. He folds, on average, to a river bet ' +
                  'roughly never.',
              },
              {
                who: 'Chip',
                text:
                  'And look at this — the woman in the cardigan with the rabbit foot. That is ' +
                  'Lucky Dolores.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Seventy-four. Plays by feel, by moon and by what her late husband said at ' +
                  'the blue chair. Calls almost anything, because the foot is never wrong.',
              },
              {
                who: 'Chip',
                text:
                  'She is in the building tonight, folks. Front row, on the rail. She has been ' +
                  'banned from four casinos for blessing the cards.',
              },
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [
          { kind: 'count', of: 'busted', atLeast: 1 },
        ],
        then: [
          {
            kind: 'reel',
            panels: [
              {
                scene: 'booth',
                ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
                lines: [
                  {
                    who: 'Chip',
                    text: 'Now, there is a stretch here our producers called "a learning period."',
                  },
                  {
                    who: 'Dr. Anand',
                    text:
                      'He went broke, Chip. Twice. Marcus had to deal him back in at the ' +
                      'kitchen table.',
                  },
                  {
                    who: 'Chip',
                    text:
                      'Resilience! That is what that is! Do not let the numbers tell you ' +
                      'otherwise!',
                  },
                  {
                    who: 'Dr. Anand',
                    text: 'I will absolutely let the numbers tell you otherwise.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Act 2 — Riverbend Landing. Deb, Cass's money, and Kit in the flesh.
  {
    id: 'arrive-riverbend',
    about: 'Arriving at Riverbend: the boat, the bankroll that buys the Harbor, and somebody asking after you. Then you walk in to its table.',
    trigger: { kind: 'enterArea', areaId: 'rb-street' },
    actions: [
      {
        kind: 'if',
        when: [{ kind: 'casino', cityId: 'silverCreek', status: 'bossBeaten' }],
        then: [
            { kind: 'dialogue', lines: ['Your phone buzzes. A voicemail, from Marcus.'] },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: It’s me. Ray called the house. Ray, who has not called anyone since 1994. He says you took Lou’s chair.',
              ],
            },
            {
              kind: 'if',
              when: [{ kind: 'flag', flag: 'trustsDana' }],
              then: [
              {
                kind: 'dialogue',
                speaker: 'marcus',
                lines: [
                  'Marcus: Dana rang as well. She says hello. She says it a lot, for somebody who only watches.',
                ],
              },
              ],
              else: [
              {
                kind: 'if',
                when: [{ kind: 'flag', flag: 'cutDanaOff' }],
                then: [
                {
                  kind: 'dialogue',
                  speaker: 'marcus',
                  lines: [
                    'Marcus: Dana asked where you’d gone. I said I didn’t know. I think she knew I was lying.',
                  ],
                },
                ],
              },
              ],
            },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: Update. I bought a bag of ice for the penthouse. It’s in my freezer. One bag. Tell the penthouse.',
              ],
            },
        ],
      },
      { kind: 'dialogue', lines: ['Riverbend Landing. A riverboat that has not moved in eleven years, and a two-five game that never stops.'] },
      {
        kind: 'dialogue',
        speaker: 'Deckhand',
        lines: [
          'Deckhand: Three hundred to sit on the boat. Twenty-five hundred and the Harbor will look at you.',
          'Deckhand: Somebody on the dock was asking if Marcus’s friend had come upriver yet. Kit, they said.',
        ],
      },
      // "Let's go" means in: off the last line you walk to the door of the boat
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 9, row: 6 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'rb-boat', col: 22, row: 18 },
      { kind: 'fade', to: 'in' },
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
      {
        kind: 'choice',
        speaker: 'kit',
        prompt: 'Kit dares you to take Cass’s money. What do you tell him?',
        options: [
          {
            label: '“I will take it, just to spite you”',
            then: [
          { kind: 'setFlag', flag: 'tookKitsDare' },
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: Good. I like a man who borrows out of pride. It always ends the same way.',
            ],
          },
            ],
          },
          {
            label: '“I will earn it myself”',
            then: [
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: Admirable. Slow, but admirable.',
            ],
          },
            ],
          },
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
      {
        kind: 'dialogue',
        speaker: 'deb',
        lines: [
          'Deb: Cass will tell you the rope is a kindness. It is a way of choosing who to watch.',
          'Deb: Everybody up that river owes somebody. The woman at the top just owes the biggest.',
        ],
      },
      { kind: 'setFlag', flag: 'clueRope' },
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
      { kind: 'setFlag', flag: 'scoutedGaines' },
      { kind: 'wait', ms: 300 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part three',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  "The riverboat! Neon on the water, a deckhand who knows everyone's business, " +
                  'and a man in a clerical collar who is, I am told, a legitimate reverend.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'He is ordained by a website. He tithes ten percent of every pot to a charity ' +
                  'called "the boat fund."',
              },
              {
                who: 'Chip',
                text: 'Reverend Gaines! A card player of God, folks, or at least of Gaines.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Scouting note, and I want to be clear this is data: he folds to a river bet ' +
                  'seven times in ten. He plays tight, bets small, and hates being asked a ' +
                  'question twice.',
              },
              {
                who: 'Chip',
                text:
                  'And Deb, the diner owner. She made our player win five pots to prove ' +
                  'himself. FIVE POTS.',
              },
              {
                who: 'Dr. Anand',
                text: 'A very low bar. I have seen him miss a pot with the nuts.',
              },
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [
          { kind: 'debt', status: ['owing', 'overdue'] },
        ],
        then: [
          {
            kind: 'reel',
            panels: [
              {
                scene: 'phone',
                ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
                notifications: [
                  { from: 'CASS', text: 'Day 9. Pay up.' },
                  { from: 'MR. EMEKA', text: 'Call me. Handshake.' },
                  { from: 'MARCUS', text: 'Eat something.' },
                ],
                lines: [
                  {
                    who: 'Chip',
                    text:
                      'And this is where our story takes the turn the lawyers asked us to ' +
                      'describe as "a financing arrangement."',
                  },
                  {
                    who: 'Dr. Anand',
                    text: 'He borrowed money, Chip. From a woman named Cass who owns a riverboat.',
                  },
                  { who: 'Chip', text: 'A bold strategy!' },
                  { who: 'Dr. Anand', text: 'A bold interest rate.' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Act 3 — Crescent Harbor. The mentor, and the rival a door ahead.
  {
    id: 'arrive-crescent',
    about: 'Arriving at Crescent Harbor: a name, a suit, and the room behind the room. Then you walk in to its table.',
    trigger: { kind: 'enterArea', areaId: 'ch-street' },
    actions: [
      {
        kind: 'if',
        when: [{ kind: 'casino', cityId: 'riverbend', status: 'bossBeaten' }],
        then: [
            { kind: 'dialogue', lines: ['Your phone buzzes. A voicemail, from Marcus.'] },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: Deb rang. Deb, who has run a boat for eleven years, rang me to say you’re fine. I have never been so frightened.',
              ],
            },
              {
                kind: 'if',
                when: [{ kind: 'debt', sponsorId: 'cass', status: 'overdue' }],
                then: [
                {
                  kind: 'dialogue',
                  speaker: 'marcus',
                  lines: [
                    'Marcus: A man called Dutch asked after you at Patel’s. Patel told him the dollar was a fake. It’s the bravest thing Patel has done.',
                  ],
                },
                ],
                else: [
                {
                  kind: 'if',
                  when: [{ kind: 'debt', sponsorId: 'cass', status: 'owing' }],
                  then: [
                  {
                    kind: 'dialogue',
                    speaker: 'marcus',
                    lines: [
                      'Marcus: I hear you owe Cass. Pay people early. It’s cheaper than apologising.',
                    ],
                  },
                  ],
                  else: [
              {
                kind: 'if',
                when: [{ kind: 'count', of: 'repaid', sponsorId: 'cass' }],
                then: [
                {
                  kind: 'dialogue',
                  speaker: 'marcus',
                  lines: [
                    'Marcus: I hear you paid Cass back. I’d have lent you the money. I’d have lent you the kitchen.',
                  ],
                },
                ],
                else: [
                  {
                    kind: 'dialogue',
                    speaker: 'marcus',
                    lines: [
                      'Marcus: You didn’t take Cass’s money. Good. Or stubborn. In my experience it’s the same thing wearing a coat.',
                    ],
                  },
                ],
              },
                  ],
                },
                ],
              },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: Ice. Two bags now, and a cooler to keep them in. The cooler has a note on it. The note says PENTHOUSE.',
              ],
            },
        ],
      },
      { kind: 'dialogue', lines: ['Crescent Harbor. Card rooms with carpet, and doors that open for people the room already knows.'] },
      {
        kind: 'dialogue',
        speaker: 'Woman in a Suit',
        lines: [
          'Woman in a Suit: Five-ten in the card room, a thousand to sit. Build a name there first.',
          'Woman in a Suit: Get a real suit and the Harbour Room may send for you. Eight thousand and the ferry to Palm Cay will.',
        ],
      },
      // "Let's go" means in: off the last line you walk to the door of the card room
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 14, row: 5 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'ch-cardroom', col: 20, row: 22 },
      { kind: 'fade', to: 'in' },
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
      {
        kind: 'dialogue',
        speaker: 'hal',
        lines: [
          'Hal: She could read a room before she could read a book. I taught her not to stop.',
          'Hal: That was the mistake. She never found the place where you are allowed to stop. She took the penthouse for a table that never closes.',
        ],
      },
      { kind: 'setFlag', flag: 'clueTable' },
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
      {
        kind: 'if',
        when: [{ kind: 'count', of: 'staked', sponsorId: 'cass' }],
        then: [{ kind: 'dialogue', speaker: 'kit', lines: ['Kit: And you took Cass’s rope. Good. Now we are the same.'] }],
        else: [{ kind: 'dialogue', speaker: 'kit', lines: ['Kit: You walked past Cass. Careful. You will get to the top owing nobody, and nobody will believe you.'] }],
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
      { kind: 'setFlag', flag: 'scoutedContessa' },
      { kind: 'wait', ms: 300 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part four',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  'Crescent Harbor! Supper clubs, a very serious card room, and Hal — the one ' +
                  'who taught Nadia Okonkwo herself!',
              },
              {
                who: 'Dr. Anand',
                text: 'And at the back of the room, the woman everyone asked about: the Contessa.',
              },
              { who: 'Chip', text: 'Darling! Of the Lyon Valmonts!' },
              {
                who: 'Dr. Anand',
                text:
                  'Of the Leeds Valmonts, it turns out. The accent slips when she is thrown. ' +
                  'She is also the most aggressive player in this building, and I have the ' +
                  'hand-history to prove it.',
              },
              { who: 'Chip', text: 'Does it work?' },
              {
                who: 'Dr. Anand',
                text:
                  'Against anyone who folds. Not against anyone who calls. It is the whole ' +
                  'game, Chip.',
              },
            ],
          },
        ],
      },
    ],
  },

  // Act 4 — Palm Cay. The midpoint: home comes to visit, and the rival borrows.
  {
    id: 'arrive-palmcay',
    about: 'Arriving at Palm Cay: the soft money, the bankroll that buys the Mesa, and a face from home. Then you walk in to its table.',
    trigger: { kind: 'enterArea', areaId: 'pc-street' },
    actions: [
      {
        kind: 'if',
        when: [{ kind: 'casino', cityId: 'crescentHarbor', status: 'bossBeaten' }],
        then: [
            { kind: 'dialogue', lines: ['Your phone buzzes. A voicemail, from Marcus.'] },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: It’s me. I’m at an airport. I’m not telling you which one, and I’m not going anywhere you’re going. Don’t read into it.',
                'Marcus: I bought a hat for the trip. I’m told it’s terrible.',
              ],
            },
            {
              kind: 'if',
              when: [{ kind: 'debt', status: 'overdue' }],
              then: [
              {
                kind: 'dialogue',
                speaker: 'marcus',
                lines: [
                  'Marcus: A man in a good coat knocked on the bakery. I said I’d never heard of you. He said he’d come back. I said that was fine. It wasn’t fine.',
                ],
              },
              ],
            },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: The ice is in a second freezer now, because the first freezer was full of the first ice. This isn’t a joke any more. Tell the penthouse it’s getting serious.',
              ],
            },
        ],
      },
      { kind: 'dialogue', lines: ['Palm Cay. Linen, rum, and people who have forgotten what day it is, playing ten-twenty-five.'] },
      {
        kind: 'dialogue',
        speaker: 'Lifeguard',
        lines: [
          'Lifeguard: Twenty-five hundred to sit in the Cay Room. Thirty thousand and you are Mesa money.',
          'Lifeguard: Somebody from your home town was asking for you on the promenade. Nice guy. Terrible hat.',
        ],
      },
      // "Let's go" means in: off the last line you walk to the door of the Cay Room
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 13, row: 5 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'pc-casino', col: 20, row: 24 },
      { kind: 'fade', to: 'in' },
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
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: I read the programme on the plane. The Invitational prize is paid by a Consortium.',
          'Marcus: Nobody has ever seen the champion spend it. Four years. Not a car, not a coat. Think about that.',
        ],
      },
      { kind: 'setFlag', flag: 'clueConsortium' },
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
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'tookKitsDare' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: Cass’s rope suits you. You have the look of somebody who likes being owed.',
            ],
          },
        ],
        else: [
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: You never borrowed. I cannot tell if that is discipline or vanity.',
            ],
          },
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Heads up, then. A side game. I put in what is left of Bernard, you put in what you like, and we find out which of us is the story.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'kit',
        prompt: 'Play Kit heads up?',
        options: [
          {
            label: 'Sit down with Kit',
            then: [
          { kind: 'startTable', tableId: 'palmcay-kit' },
            ],
          },
          {
            label: 'Not today',
            then: [
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: Afraid of the answer. Fair.',
            ],
          },
            ],
          },
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
      { kind: 'setFlag', flag: 'scoutedBernard' },
      { kind: 'wait', ms: 300 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part five',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  'Palm Cay! Sun, sand, and a man named Bernard who has been at the same table ' +
                  'for two days.',
              },
              {
                who: 'Dr. Anand',
                text: 'He is on his third bucket of chips. He believes it is Thursday. It is not.',
              },
              {
                who: 'Chip',
                text: "He is also, folks, on tonight's final table. Do not ask me how.",
              },
              {
                who: 'Dr. Anand',
                text:
                  'A very rich relative arranged it. He calls everything. Everything. He has ' +
                  'never folded a pair in his life and he is, statistically, on the wrong end ' +
                  'of the maths. Which does not mean he can be ignored. He has more chips than ' +
                  'the rest of the table combined.',
              },
              {
                who: 'Chip',
                text:
                  'And Marcus! Marcus, who came on holiday and went home with a sunburn and a ' +
                  'feeling.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'I have a note here. It says "thirty thousand, then home before he starts ' +
                  'believing in things." Quoting directly.',
              },
            ],
          },
        ],
      },
    ],
  },

  // Act 5 — Neon Mesa. The debt comes due on somebody else.
  {
    id: 'arrive-mesa',
    about: 'Arriving at Neon Mesa: the studied money, and the bankroll that buys the plane to Lumina. Then you walk in to its table.',
    trigger: { kind: 'enterArea', areaId: 'nm-street' },
    actions: [
      {
        kind: 'if',
        when: [{ kind: 'casino', cityId: 'palmCay', status: 'bossBeaten' }],
        then: [
            { kind: 'dialogue', lines: ['Your phone buzzes. A voicemail, from Marcus.'] },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: I got home from the Cay and the kitchen was smaller. I don’t mean that sadly. I mean I measured it.',
                'Marcus: They’re saying Inés Calloway lost to a kid in a plain shirt. Nobody here knows it’s you. I’ve told everybody.',
              ],
            },
            {
              kind: 'if',
              when: [{ kind: 'debt', status: ['owing', 'overdue'] }],
              then: [
              {
                kind: 'dialogue',
                speaker: 'marcus',
                lines: [
                  'Marcus: Pay what you owe before you reach Lumina. Whatever you do up there, do it owing nobody. That’s my only advice and it isn’t about poker.',
                ],
              },
              ],
            },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: The ice has outgrown the freezers. The baker downstairs lent me the walk-in. He wants rent in ice. I’m beginning to think the ice has a plan.',
              ],
            },
        ],
      },
      { kind: 'dialogue', lines: ['Neon Mesa. Everything lit, everybody studied, and nobody at the tables twitches for free.'] },
      {
        kind: 'dialogue',
        speaker: 'Tout',
        lines: [
          'Tout: Ten thousand for the main game. Ninety and they will put you on the plane to Lumina.',
          'Tout: And the high roller room looks at your shoes. I am serious about the shoes.',
        ],
      },
      // "Let's go" means in: off the last line you walk to the door of the casino
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 6, row: 6 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'nm-casino', col: 22, row: 24 },
      { kind: 'fade', to: 'in' },
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
      {
        kind: 'choice',
        speaker: 'kit',
        prompt: 'Kit is eleven thousand short of the Consortium. What do you do?',
        options: [
          {
            label: 'Stake him $10,000',
            conditions: [{ kind: 'cashAtLeast', amount: 10000 }],
            then: [
          { kind: 'giveCash', amount: -10000 },
          { kind: 'setFlag', flag: 'stakedKit' },
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: ...You are serious.',
              'Kit: Ten. I will find the eleventh. Do not look for me. I will come to you.',
            ],
          },
            ],
          },
          {
            label: 'Tell Mr. Lowe where he is going',
            then: [
          { kind: 'setFlag', flag: 'tippedOffKit' },
          {
            kind: 'dialogue',
              lines: [
              'You find Mr. Lowe by the cashier and say one word. Kit is still on the plane when a hand lands on his shoulder.',
            ],
          },
            ],
          },
          {
            label: 'Say nothing',
            then: [
          { kind: 'setFlag', flag: 'ignoredKit' },
          {
            kind: 'dialogue',
            speaker: 'kit',
            lines: [
              'Kit: Right. Nothing. I know what that looks like.',
            ],
          },
            ],
          },
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
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: Since you will hear it anyway: I am not Nadia’s friend. I am her scout, and I was given a brief.',
          'Dana: Find somebody who plays fair under pressure. Somebody she cannot buy and cannot fix. She would not say why.',
        ],
      },
      { kind: 'setFlag', flag: 'clueScout' },
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
      { kind: 'setFlag', flag: 'scoutedZeke' },
      { kind: 'wait', ms: 300 },
      {
        kind: 'reel',
        title: 'The Road to the Final, part six',
        panels: [
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text:
                  'The Neon Mesa! Slots, noise, a casino that never sleeps, and a streamer who ' +
                  'never stops talking.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Zeke "KingPin." Plays to the camera, not the cards. He bluffs when the chat ' +
                  'is bored and folds when the chat is scared.',
              },
              { who: 'Chip', text: 'He has eleven thousand people watching.' },
              {
                who: 'Dr. Anand',
                text: 'And one of them is his mum. He told us. He tells everyone.',
              },
              {
                who: 'Chip',
                text:
                  'And Dana! The woman who has been watching our player from the corner of ' +
                  'every room since the first night!',
              },
              {
                who: 'Dr. Anand',
                text:
                  'I would like to know who she is writing to. I have a theory. I will not ' +
                  'share it on air.',
              },
            ],
          },
        ],
      },
    ],
  },

  // Act 6 — Porto Lumina. Everything that followed you up was pointing here.
  {
    id: 'arrive-lumina',
    about: 'Arriving at Porto Lumina: the nosebleed, the tournament, and the man who photographs the winner. Then you walk in to the casino, where Nadia is waiting at the foyer rope (`nadia-names-the-match`).',
    trigger: { kind: 'enterArea', areaId: 'pl-street' },
    actions: [
      {
        kind: 'if',
        when: [{ kind: 'casino', cityId: 'neonMesa', status: 'bossBeaten' }],
        then: [
            { kind: 'dialogue', lines: ['Your phone buzzes. A voicemail, from Marcus.'] },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: A car has come for me. A black car, with a driver. He says Ms. Okonkwo sent it, and he knew my name.',
                'Marcus: I haven’t said yes. I’m sitting in the back with the door shut. The seats are heated. I want you to know I’m not enjoying it.',
              ],
            },
            {
              kind: 'dialogue',
              speaker: 'marcus',
              lines: [
                'Marcus: I’m bringing the ice. All of it. The baker wants his walk-in back on Tuesday.',
                'Marcus: Pick up when you can. I’ll be at the rail.',
              ],
            },
        ],
      },
      {
        kind: 'dialogue',
        lines: ['Porto Lumina. A waterfront, a tower lit from the base, and forty-one floors above the casino, a penthouse.'],
      },
      {
        kind: 'dialogue',
        speaker: 'Photographer',
        lines: [
          'Photographer: Thirty thousand at the nosebleed. Twenty to enter the Poker Legends tournament, and the winner sits down with Ms. Okonkwo at the Invitational.',
          'Photographer: Four years I have photographed her winning. Give me a reason to photograph somebody else.',
        ],
      },
      // "Let's go" means in: off the last line you walk to the door of the casino
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 15, row: 6 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'pl-casino', col: 28, row: 33 },
      { kind: 'fade', to: 'in' },
    ],
  },
  {
    id: 'kit-lumina',
    about: 'The rival broken: forty hands against Nadia, the Consortium’s men, and a warning about Wen.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'flag', flag: 'stakedKit', set: false },
      { kind: 'flag', flag: 'ignoredKit', set: false },
      { kind: 'flag', flag: 'tippedOffKit', set: false },
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
    id: 'kit-lumina-staked',
    about:
      'The rival you staked: he stands at the rail, solvent, and says what Wen’s terms really are.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'eventDone', eventId: 'kit-lumina', done: false },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'flag', flag: 'stakedKit' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Your ten bought two days. Forty hands against her bought the rest of it back.',
          'Kit: I will be at the rail. I will pay you back whatever happens.',
          'Kit: Wen’s terms: she does not want the money. She wants to be owed. Do not be the one who lets her.',
        ],
      },
    ],
  },
  {
    id: 'kit-lumina-ignored',
    about:
      'The rival you left alone: he took Wen’s money, and he is at the final table.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'eventDone', eventId: 'kit-lumina', done: false },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'flag', flag: 'stakedKit', set: false },
      { kind: 'flag', flag: 'ignoredKit' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: You said nothing. I noticed.',
          'Kit: So I took Wen’s money. It is not much of a debt if you plan to win.',
          'Kit: I will see you at the final table. I am going to play you like I have never been owed a thing.',
        ],
      },
    ],
  },
  {
    id: 'kit-lumina-tipped',
    about:
      'The rival you gave to the collectors: he is hunted, and he knows who talked.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'eventDone', eventId: 'kit-lumina', done: false },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'flag', flag: 'stakedKit', set: false },
      { kind: 'flag', flag: 'ignoredKit', set: false },
      { kind: 'flag', flag: 'tippedOffKit' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Mr. Lowe knew which plane. Mr. Lowe does not read the manifests.',
          'Kit: I am not going to say it. I am going to remember it.',
          'Kit: Do not take Wen’s money. I know what it is like on the other side.',
        ],
      },
    ],
  },
  {
    id: 'lumina-welcome',
    about:
      'Coming through the foyer rope into the casino: Marcus and Dana are waiting for you. They explain the ' +
      'tournament (the entry, ten rounds of ten hands, the blinds, the replacements, the final table, the seat at ' +
      'the Invitational), foreshadow the final table and Nadia, and walk you to the entry desk. Nadia herself is met ' +
      'later (`nadia-names-the-match`).',
    // The foyer is roped off but for one gap, so you cannot come into the hall without stepping on it.
    trigger: { kind: 'standOn', areaId: 'pl-casino', col: 28, row: 32 },
    conditions: [{ kind: 'chapter', cityId: 'portoLumina' }],
    actions: [
      {
        kind: 'dialogue',
        lines: ['A hall the size of a ballroom: nine tables under the chandeliers, and somebody in a sports jacket waving both arms at you.'],
      },
      { kind: 'moveNpc', characterId: 'marcus', from: { col: 19, row: 29 }, to: 'player', pace: 'run' },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: There he is! They would not let me past the rope until I said I was your uncle. The loud side.',
          'Marcus: A car came for me, man. A driver. He called me Mr. Marcus. I have not stopped thinking about it.',
        ],
      },
      { kind: 'moveNpc', characterId: 'dana', from: { col: 37, row: 29 }, to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: He means well. Let me tell it properly, because you only get the one chance to hear it.',
          'Dana: Tonight is the Poker Legends tournament. Nine tables in this hall, and you play at one of them.',
          'Dana: Twenty thousand to enter, and twenty thousand in chips to play with. Ten rounds, ten hands a round. Every round the blinds go up.',
          'Dana: When somebody is knocked out, somebody new sits down in their chair with a stack that fits the stage. The table never thins.',
          'Dana: Get through the tenth round and your table is announced as the final table. Beat everybody sat at it, and you have a seat at the Legends Invitational.',
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Knocked out, and it is twenty thousand again, from the first hand. So do not get knocked out.',
          'Marcus: The Invitational is the televised one. Six chairs and cameras on every one. That is the table I told you about on the 14.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'dana',
        prompt: 'What do you ask?',
        options: [
          {
            label: 'Who is at that table?',
            then: [
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: People you have met on the way up, mostly. They are the ones who held on.',
                  'Dana: And one chair at the end that is not for anybody who walks in off this floor. It has had the same name on it for four years.',
                ],
              },
            ],
          },
          {
            label: 'Who is Nadia?',
            then: [
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: Nadia Okonkwo. She lives in the penthouse over this floor, and she has never lost the last table she sat at.',
                  'Dana: She does not greet the floor. If she wants to see you, you will know it. I would be a little careful when she does.',
                ],
              },
              { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Careful. Right. She is lovely. She sent a car.'] },
            ],
          },
          {
            label: 'Take me to the desk',
            then: [{ kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: That is the spirit. Not a question in his head.'] }],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Come on. The entry desk is at the back, under the chandelier. We will walk you.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 29, row: 4 } },
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 27, row: 4 }, youFollow: true },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Here. Give the nice man twenty thousand and a smile. I will be at the rail, being your uncle.',
          'Marcus: Go and be a story I can tell.',
        ],
      },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: One more thing. If you get to the final table, somebody will be sitting at the end of it, looking at you like she has read the last page.',
          'Dana: Do not let her read you. Play the cards, not the woman. Go on.',
        ],
      },
    ],
  },
  {
    id: 'nadia-names-the-match',
    about:
      'Walking up to Nadia in the hall, after Marcus and Dana have foreshadowed her (`lumina-welcome`): she knows ' +
      'the kitchen table, somebody has been writing to her about you, she sent a car for Marcus, and she ' +
      'says what it takes: win the Poker Legends tournament and you sit across from her. What you ask her is ' +
      'heard again by Dana (`dana-reveal`) and Marcus (`marcus-at-the-rail`).',
    trigger: { kind: 'interact', poiId: 'nadia' },
    conditions: [{ kind: 'chapter', cityId: 'portoLumina' }, { kind: 'eventDone', eventId: 'lumina-welcome' }],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: So you are the one from the kitchen table in Basin.',
          'Nadia: Somebody I trust has been writing to me about you since Marcus’s game.',
          'Nadia: Your friends will have told you how tonight works. Win the floor, and you have a seat at the final table of the Legends Invitational.',
          'Nadia: The chair at the end of that table is mine. It has been for four years. Win that, and the floor upstairs goes with the trophy.',
          'Nadia: I have sent a car for your friend Marcus. A challenger should have somebody at the rail.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'nadia',
        prompt: 'What do you say to her?',
        options: [
          {
            label: 'I will be ready',
            then: [{ kind: 'dialogue', speaker: 'nadia', lines: ['Nadia: Everybody says that. Come back when it is true.'] }],
          },
          {
            label: 'Who has been writing to you?',
            then: [
              { kind: 'setFlag', flag: 'askedNadiaWho' },
              {
                kind: 'dialogue',
                speaker: 'nadia',
                lines: ['Nadia: Ask her yourself. She is in the corner of this room most nights, with her back to the wall.'],
              },
            ],
          },
          {
            label: 'Leave Marcus out of this',
            then: [
              { kind: 'setFlag', flag: 'toldNadiaLeaveMarcus' },
              {
                kind: 'dialogue',
                speaker: 'nadia',
                lines: ['Nadia: He is your rail. Everybody needs a rail. The car has already gone.'],
              },
            ],
          },
        ],
      },
      { kind: 'dialogue', speaker: 'nadia', lines: ['Nadia: The desk is at the back, under the chandelier. I will be watching the floor.'] },
    ],
  },
  {
    id: 'dana-reveal',
    about:
      'The reveal: Dana has been Nadia’s scout all along, writing to her about you since the first night. ' +
      'She remembers how you answered her on the 14, and you decide how you take it.',
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
      {
        kind: 'if',
        when: [
          { kind: 'flag', flag: 'clueWatch' },
          { kind: 'flag', flag: 'clueRing' },
          { kind: 'flag', flag: 'clueRope' },
          { kind: 'flag', flag: 'clueTable' },
          { kind: 'flag', flag: 'clueConsortium' },
          { kind: 'flag', flag: 'clueScout' },
        ],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: You have been asking round. Marcus, Ray, Deb, Hal. You have most of it already, so here is the rest.',
              'Dana: The penthouse is not hers. Madame Wen paid for Nadia’s first stack, and Nadia has been paying her back ever since. She holds that room as Wen’s collateral.',
              'Dana: She cannot lose on purpose. Wen would take the room, and her with it. She needs somebody to beat her clean, in front of everyone, so nobody can call it a gift.',
              'Dana: That was my brief. Not a scout. Somebody she cannot buy and cannot fix.',
            ],
          },
        ],
        else: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: There is more to her than I can say here. Keep asking and somebody will tell you.',
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'askedNadiaWho' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: She told you to ask me. She always makes me say it myself.'] }],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'askedDanaWhy' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You asked me on the 14 why I watch. I told you. You did not hear it.'] }],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'toldDanaToWatch' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You told me to watch, on the 14. So I watched, and I wrote it all down.'] }],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'brushedOffDana' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You told me to mind my own business. You were my business.'] }],
      },
      {
        kind: 'choice',
        speaker: 'dana',
        prompt: 'How do you take it?',
        options: [
          {
            label: 'I am glad it was you',
            then: [
              { kind: 'setFlag', flag: 'trustsDana' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: ...So am I.', 'Dana: Go and say hello to her. I will be in the corner.'] },
            ],
          },
          {
            label: 'You could have told me',
            then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: And you would have played the same? Nobody does.'] }],
          },
          {
            label: 'Stay away from my games',
            then: [
              { kind: 'setFlag', flag: 'cutDanaOff' },
              { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Mm. That is fair.', 'Dana: I will not write to her about you again.'] },
            ],
          },
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
      // He is only in Porto Lumina once he has met you at the rope; saying so keeps
      // this apart from the kitchen table he deals in Basin before then.
      { kind: 'eventDone', eventId: 'lumina-welcome' },
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
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'toldNadiaLeaveMarcus' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'marcus',
            lines: ['Marcus: The driver said you told her to leave me out of it. Thank you. I came anyway. Obviously I came.'],
          },
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
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'cutDanaOff' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: ['Dana: You told me to stay away from your games. This is me doing it. After tonight.'],
          },
        ],
        else: [
          {
            kind: 'if',
            when: [{ kind: 'flag', flag: 'trustsDana' }],
            then: [
              {
                kind: 'dialogue',
                speaker: 'dana',
                lines: [
                  'Dana: I am going to write to you about them. Whether you like it or not.',
                  'Dana: The first letter is already under your door.',
                ],
              },
            ],
            else: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: I could write to you about them. If you like.'] }],
          },
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'penthouseSettled' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: You paid Wen from the prize. It is in the book as a debt cleared. I have never written that column before.',
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'penthouseWen' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: Wen rang the desk this morning to ask after the room. Politely. That is how it starts.',
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'penthouseFund' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: [
              'Dana: Three letters already, asking about the fund. One of them is in Kit’s handwriting.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kit-after',
    about: 'Aftermath: the rival asks the winner for a stake. You are the sponsor now, and it is your call.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'flag', flag: 'stakedKit', set: false },
      { kind: 'flag', flag: 'tippedOffKit', set: false },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: You did it. Of course you did. You were slower.',
          'Kit: I am told you are the one people come to now. For a stake.',
          'Kit: Ten thousand. Eleven days at the nosebleed and the Consortium off my back. You would have it back doubled.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'kit',
        prompt: 'Stake Kit $10,000?',
        options: [
          {
            label: 'Stake him $10,000',
            conditions: [{ kind: 'cashAtLeast', amount: 10000 }],
            then: [
              { kind: 'giveCash', amount: -10000 },
              { kind: 'setFlag', flag: 'stakedKit' },
              {
                kind: 'dialogue',
                speaker: 'kit',
                lines: ['Kit: ...You actually did it.', 'Kit: Eleven days. Do not come looking for me. I will come to you.'],
              },
            ],
          },
          {
            label: 'Not this time',
            then: [{ kind: 'dialogue', speaker: 'kit', lines: ['Kit: Fair. I would have said no to me too.', 'Kit: Remember I asked nicely.'] }],
          },
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
  // The kitchen table, any time: once the first night is won it stays out. The
  // stake is Marcus's, so a win is money for nothing and a loss costs nothing.
  {
    id: 'silvercreek-boss-door',
    about:
      'The private room opens: Lou comes out on the floor, finds you and walks you to the door himself. ' +
      'Casino goals lead you to the table; the table is the rest.',
    trigger: { kind: 'enterArea', areaId: 'sc-floor', onLoad: true },
    conditions: [
      { kind: 'casino', cityId: 'silverCreek', status: 'roomOpen' },
      { kind: 'casino', cityId: 'silverCreek', status: 'bossBeaten', set: false },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'lou', from: { col: 28, row: 20 }, to: 'player' },
      { kind: 'dialogue', speaker: 'lou', lines: [
          'Lou: Four hundred off my floor. Nobody does that and sits down after.',
          'Lou: Come on. I do not hold the door for just anyone, and I am not holding it twice.',
          'Lou: Mind the humidor. My nephew is not allowed near it either.',
        ] },
      { kind: 'moveNpc', characterId: 'lou', to: { col: 28, row: 20 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'sc-private', col: 7, row: 8, with: ['lou'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'lou', lines: [
          'Lou: Sit. The dealer knows the rules, and so do I, which is worse for you.',
          'Lou: Five hundred each. Last one with chips walks out.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'lou',
        lines: [
          'Lou: I remember every stack that ever came in on a ring. One girl won hers back. Somebody called Mr. W paid for her third.',
        ],
      },
      { kind: 'setFlag', flag: 'clueRing' },
      { kind: 'dialogue', lines: ['The dealer is at the table. Talk to the dealer when you are ready to sit.'] },
    ],
  },
  {
    id: 'silvercreek-boss-sendoff',
    about:
      'The boss is down: Lou walks you out to the bus stop and sees you onto the way to Riverbend. ' +
      'A walked send-off, with no ride: the bus is still yours to board.',
    trigger: { kind: 'enterArea', areaId: 'sc-private', onLoad: true },
    conditions: [
      { kind: 'chapter', cityId: 'silverCreek' },
      { kind: 'casino', cityId: 'silverCreek', status: 'bossBeaten' },
      { kind: 'eventDone', eventId: 'arrive-silvercreek' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'lou', from: { col: 6, row: 6 }, to: 'player' },
      { kind: 'dialogue', speaker: 'lou', lines: [
        'Lou: Well, I will be.',
        'Lou: That is thirty years I have owned this saloon and nobody has done that to me sitting down.',
        'Lou: Go on. The bus to the river runs whether I like it or not.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'sc-street', col: 26, row: 12, with: ['lou'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['A driver at the Silver Creek stop is holding the Riverbend bus. He has been told by somebody who owns the town.'] },
      { kind: 'dialogue', speaker: 'lou', lines: [
          'Lou: The Riverbend bus. I rang ahead, so the driver will not leave you at the depot.',
          'Lou: Go on. Before I ask for a rematch.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'lou',
        lines: [
          'Lou: The chair at the rail is yours any night. And if you meet that girl with the ring, tell her Lou says it was a fair price.',
        ],
      },
      { kind: 'playSound', sound: 'win' },
      { kind: 'moveNpc', characterId: 'lou', to: { col: 27, row: 12 }, leaves: true },
      { kind: 'dialogue', lines: ['Riverbend is open to you. Take the bus when you are ready.'] },
    ],
  },
  {
    id: 'riverbend-boss-door',
    about:
      'The private room opens: Odette comes out on the floor, finds you and walks you to the door himself. ' +
      'Casino goals lead you to the table; the table is the rest.',
    trigger: { kind: 'enterArea', areaId: 'rb-boat', onLoad: true },
    conditions: [
      { kind: 'casino', cityId: 'riverbend', status: 'roomOpen' },
      { kind: 'casino', cityId: 'riverbend', status: 'bossBeaten', set: false },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'odette', from: { col: 13, row: 18 }, to: 'player' },
      { kind: 'dialogue', speaker: 'odette', lines: [
          'Odette: Hm. Twelve hundred taken off my tables. The deckhand sent a note up.',
          'Odette: Walk with me. The cabin is aft, and I do not shout down corridors.',
        ] },
      { kind: 'moveNpc', characterId: 'odette', to: { col: 13, row: 18 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'rb-private', col: 7, row: 8, with: ['odette'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'odette', lines: [
          'Odette: Shut the door. Boat rules: one table, one winner, no rebuy.',
          'Odette: Cut your chips like you mean it.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'odette',
        lines: [
          'Odette: Cass’s rope is how the river chooses who to watch. Everybody who borrows gets looked at by someone upstairs.',
        ],
      },
      { kind: 'setFlag', flag: 'clueRope' },
      { kind: 'dialogue', lines: ['The dealer is at the table. Talk to the dealer when you are ready to sit.'] },
    ],
  },
  {
    id: 'riverbend-boss-sendoff',
    about:
      'The boss is down: Odette walks you out to the dock and sees you onto the way to Crescent Harbor. ' +
      'A walked send-off, with no ride: the bus is still yours to board.',
    trigger: { kind: 'enterArea', areaId: 'rb-private', onLoad: true },
    conditions: [
      { kind: 'chapter', cityId: 'riverbend' },
      { kind: 'casino', cityId: 'riverbend', status: 'bossBeaten' },
      { kind: 'eventDone', eventId: 'arrive-riverbend' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'odette', from: { col: 6, row: 6 }, to: 'player' },
      { kind: 'dialogue', speaker: 'odette', lines: [
        'Odette: Hm.',
        'Odette: I have put a hundred men over the side of this boat, and you are the first who made me enjoy it.',
        'Odette: Harbor will be a different animal. Go and be eaten by it.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'rb-street', col: 26, row: 12, with: ['odette'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['A deckhand on the Riverbend dock rings the boat\u2019s bell twice. Somebody has wired the harbor transit that you are coming.'] },
      { kind: 'dialogue', speaker: 'odette', lines: [
          'Odette: The harbor ferry rides the same tide as the bus. I have signalled ahead.',
          'Odette: Do not look back at the boat. It makes the sailors nervous.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'odette',
        lines: [
          'Odette: You played the boat like you were already somewhere else. Go there. Mind Cass: ropes get shorter.',
        ],
      },
      { kind: 'playSound', sound: 'win' },
      { kind: 'moveNpc', characterId: 'odette', to: { col: 27, row: 12 }, leaves: true },
      { kind: 'dialogue', lines: ['Crescent Harbor is open to you. Take the bus when you are ready.'] },
    ],
  },
  {
    id: 'crescent-boss-door',
    about:
      'The private room opens: Bellamy comes out on the floor, finds you and walks you to the door himself. ' +
      'Casino goals lead you to the table; the table is the rest.',
    trigger: { kind: 'enterArea', areaId: 'ch-cardroom', onLoad: true },
    conditions: [
      { kind: 'casino', cityId: 'crescentHarbor', status: 'roomOpen' },
      { kind: 'casino', cityId: 'crescentHarbor', status: 'bossBeaten', set: false },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'bellamy', from: { col: 34, row: 22 }, to: 'player' },
      { kind: 'dialogue', speaker: 'bellamy', lines: [
          'Bellamy: Four thousand off the card room, quietly. I admire quiet.',
          'Bellamy: Come along. I will not insult you by sending somebody else.',
        ] },
      { kind: 'moveNpc', characterId: 'bellamy', to: { col: 34, row: 22 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'ch-private', col: 7, row: 8, with: ['bellamy'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'bellamy', lines: [
          'Bellamy: Please. The chair on the left is the better one.',
          'Bellamy: One match, one winner, and a very good reason not to talk about it.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'bellamy',
        lines: [
          'Bellamy: Hal sends me his best pupils. Then they stop writing. He sent me a girl once. She read my room in a minute and never sat down properly again.',
        ],
      },
      { kind: 'setFlag', flag: 'clueTable' },
      { kind: 'dialogue', lines: ['The dealer is at the table. Talk to the dealer when you are ready to sit.'] },
    ],
  },
  {
    id: 'crescent-boss-sendoff',
    about:
      'The boss is down: Bellamy walks you out to the transit hub and sees you onto the way to Palm Cay. ' +
      'A walked send-off, with no ride: the bus is still yours to board.',
    trigger: { kind: 'enterArea', areaId: 'ch-private', onLoad: true },
    conditions: [
      { kind: 'chapter', cityId: 'crescentHarbor' },
      { kind: 'casino', cityId: 'crescentHarbor', status: 'bossBeaten' },
      { kind: 'eventDone', eventId: 'arrive-crescent' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'bellamy', from: { col: 6, row: 6 }, to: 'player' },
      { kind: 'dialogue', speaker: 'bellamy', lines: [
        'Bellamy: Well played. I will say so once and not again.',
        'Bellamy: The house has noted it. The island will have noted it by Tuesday.',
        'Bellamy: Go east.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'ch-street', col: 26, row: 12, with: ['bellamy'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['A black car idles outside the Harbor transit hub. Its driver has already bought your ticket to Palm Cay.'] },
      { kind: 'dialogue', speaker: 'bellamy', lines: [
          'Bellamy: My car is out front, and I have asked it to take you to the transit hub.',
          'Bellamy: It is the least I can do for the man who beat me.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'bellamy',
        lines: [
          'Bellamy: Tell Hal he may stop writing. The girl never took the lesson. You might.',
        ],
      },
      { kind: 'playSound', sound: 'win' },
      { kind: 'moveNpc', characterId: 'bellamy', to: { col: 27, row: 12 }, leaves: true },
      { kind: 'dialogue', lines: ['Palm Cay is open to you. Take the bus when you are ready.'] },
    ],
  },
  {
    id: 'palmcay-boss-door',
    about:
      'The private room opens: Ines comes out on the floor, finds you and walks you to the door himself. ' +
      'Casino goals lead you to the table; the table is the rest.',
    trigger: { kind: 'enterArea', areaId: 'pc-casino', onLoad: true },
    conditions: [
      { kind: 'casino', cityId: 'palmCay', status: 'roomOpen' },
      { kind: 'casino', cityId: 'palmCay', status: 'bossBeaten', set: false },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'ines', from: { col: 11, row: 24 }, to: 'player' },
      { kind: 'dialogue', speaker: 'ines', lines: [
          'Ines: Twelve thousand, on my carpet, between lunches. I like you already.',
          'Ines: Come. I keep the good table at the back, where the sea breeze cannot read your cards.',
        ] },
      { kind: 'moveNpc', characterId: 'ines', to: { col: 11, row: 24 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'pc-private', col: 7, row: 8, with: ['ines'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'ines', lines: [
          'Ines: Sit, sit. Sparkling water is on me. The match is not.',
          'Ines: Heads up, to the last chip. It is the only honest way.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'ines',
        lines: [
          'Inés: My honeymoon was comped by the Consortium. The same people sign the Invitational’s cheque, and nobody has seen the champion spend a cent of it.',
        ],
      },
      { kind: 'setFlag', flag: 'clueConsortium' },
      { kind: 'dialogue', lines: ['The dealer is at the table. Talk to the dealer when you are ready to sit.'] },
    ],
  },
  {
    id: 'palmcay-boss-sendoff',
    about:
      'The boss is down: Ines walks you out to the ferry dock and sees you onto the way to Neon Mesa. ' +
      'A walked send-off, with no ride: the bus is still yours to board.',
    trigger: { kind: 'enterArea', areaId: 'pc-private', onLoad: true },
    conditions: [
      { kind: 'chapter', cityId: 'palmCay' },
      { kind: 'casino', cityId: 'palmCay', status: 'bossBeaten' },
      { kind: 'eventDone', eventId: 'arrive-palmcay' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'ines', from: { col: 6, row: 6 }, to: 'player' },
      { kind: 'dialogue', speaker: 'ines', lines: [
        'Inés: Oh, that was lovely. I haven’t been robbed that politely since 2009.',
        'Inés: You will want Mesa. They have no sense of humour there at all.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'pc-street', col: 26, row: 12, with: ['ines'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['The Palm Cay ferry is idling at the dock with its gangway still down. The crew are looking up at the casino\u2019s windows.'] },
      { kind: 'dialogue', speaker: 'ines', lines: [
          'Ines: The ferry leaves in a few minutes. I asked them to hold it, and they are very bad at saying no to me.',
          'Ines: Go. Leave me with my sea.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'ines',
        lines: [
          'Inés: I will write to the Mesa ahead of you. They will know your name. Ask the Consortium for nothing: let them be curious.',
        ],
      },
      { kind: 'playSound', sound: 'win' },
      { kind: 'moveNpc', characterId: 'ines', to: { col: 27, row: 12 }, leaves: true },
      { kind: 'dialogue', lines: ['Neon Mesa is open to you. Take the bus when you are ready.'] },
    ],
  },
  {
    id: 'mesa-boss-door',
    about:
      'The private room opens: Vale comes out on the floor, finds you and walks you to the door himself. ' +
      'Casino goals lead you to the table; the table is the rest.',
    trigger: { kind: 'enterArea', areaId: 'nm-casino', onLoad: true },
    conditions: [
      { kind: 'casino', cityId: 'neonMesa', status: 'roomOpen' },
      { kind: 'casino', cityId: 'neonMesa', status: 'bossBeaten', set: false },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'vale', from: { col: 7, row: 24 }, to: 'player' },
      { kind: 'dialogue', speaker: 'vale', lines: [
          'Vale: Forty thousand on the Mesa floor. People do not do that without wanting something.',
          'Vale: Come up. The suite is private, and I record everything in it.',
        ] },
      { kind: 'moveNpc', characterId: 'vale', to: { col: 7, row: 24 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'nm-private', col: 7, row: 8, with: ['vale'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'vale', lines: [
          'Vale: This is not a game for the cameras. They are off, I promise.',
          'Vale: Everything on the table. Nobody else has ever stayed to the end.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'vale',
        lines: [
          'Vale: The Consortium keeps a champion. It is not Nadia’s name on the cheque. And there is a boy on the Strip eleven short, pretending he is not. I would not be him.',
        ],
      },
      { kind: 'dialogue', lines: ['The dealer is at the table. Talk to the dealer when you are ready to sit.'] },
    ],
  },
  {
    id: 'mesa-boss-sendoff',
    about:
      'The boss is down: Vale walks you out to the airport shuttle and sees you onto the way to Porto Lumina. ' +
      'A walked send-off, with no ride: the bus is still yours to board.',
    trigger: { kind: 'enterArea', areaId: 'nm-private', onLoad: true },
    conditions: [
      { kind: 'chapter', cityId: 'neonMesa' },
      { kind: 'casino', cityId: 'neonMesa', status: 'bossBeaten' },
      { kind: 'eventDone', eventId: 'arrive-mesa' },
    ],
    actions: [
      { kind: 'wait', ms: 300 },
      { kind: 'moveNpc', characterId: 'vale', from: { col: 6, row: 6 }, to: 'player' },
      { kind: 'dialogue', speaker: 'vale', lines: [
        'Vale: …',
        'Vale: Nobody has beaten me in this room in nine years. I find I am not offended.',
        'Vale: Lumina. Her door is open to you now. Mine always was.',
      ] },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'nm-street', col: 26, row: 15, with: ['vale'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', lines: ['A black shuttle waits on the Mesa tarmac with its engine running. Nobody on board asks for a ticket.'] },
      { kind: 'dialogue', speaker: 'vale', lines: [
          'Vale: The shuttle is on the tarmac. It goes where I have never gone, and I own half the airport.',
          'Vale: Go and be the one who finally sits down across from her.',
        ] },
      {
        kind: 'dialogue',
        speaker: 'vale',
        lines: [
          'Vale: The Consortium keeps a list. Today you moved up it. Take the plane.',
        ],
      },
      { kind: 'playSound', sound: 'win' },
      { kind: 'moveNpc', characterId: 'vale', to: { col: 27, row: 15 }, leaves: true },
      { kind: 'dialogue', lines: ['Porto Lumina is open to you. Take the bus when you are ready.'] },
    ],
  },
  {
    id: 'home-game',
    about: "Marcus's card table, open whenever you are at his place: the first night's game again, free to sit down at.",
    trigger: { kind: 'interact', poiId: 'home-game-table' },
    conditions: [{ kind: 'flag', flag: 'wonPokerNight' }],
    repeatable: true,
    actions: [
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: ['Marcus: Pull up a chair. My chips, your luck.', 'Marcus: Winner takes the lot. Same rule as ever.'],
      },
      { kind: 'startPokerNight' },
    ],
  },
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
    id: 'poker-night-lost',
    about:
      'Up from Marcus’s table the first night without the money: the first loss is a beat, not a silence. ' +
      'Marcus says the chairs stay out, Dana says what she saw, and you know where to find him to go again.',
    trigger: { kind: 'enterArea', areaId: 'marcus-house', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night' },
      { kind: 'chapter', cityId: 'apartment' },
      // The hours he is home, which are the hours his game is on.
      { kind: 'period', period: ['afternoon', 'evening', 'night'] },
    ],
    actions: [
      { kind: 'wait', ms: 400 },
      { kind: 'dialogue', lines: ['Your last chip goes across the felt. Marcus counts it twice, like it might be a trick.'] },
      { kind: 'moveNpc', characterId: 'marcus', from: { col: 5, row: 6 }, to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'marcus',
        lines: [
          'Marcus: Everything on the table. I hate that rule. I made that rule.',
          'Marcus: The chairs stay out. Any night, from the afternoon. Talk to me and I deal you straight back in.',
        ],
      },
      { kind: 'moveNpc', characterId: 'dana', from: { col: 9, row: 5 }, to: 'player' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'Dana: You raised the river again. It worked on Tuesday because nobody on Tuesday was watching.',
          'Dana: Bet the good hands, and let Marcus do the bluffing. He is bad at it.',
        ],
      },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Do not tell them how I play. I am right here.'] },
    ],
  },
  {
    id: 'marcus-deals-you-back-in',
    about:
      'The way back from broke: below the cheapest seat on the ladder, Marcus offers the kitchen table ' +
      'again — the same game that started the run — and you can say no and climb back alone. Wherever the story has got to.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'cashBelow', amount: 100 },
      { kind: 'chapter', cityId: ['apartment', 'silverCreek', 'riverbend', 'crescentHarbor', 'neonMesa', 'portoLumina'] },
      { kind: 'eventDone', eventId: 'lumina-welcome', done: false },
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
      {
        kind: 'choice',
        speaker: 'marcus',
        prompt: 'Sit down at the kitchen table?',
        options: [
          { label: 'Deal me in', then: [{ kind: 'clearFlag', flag: 'turnedDownMarcus' }, { kind: 'startPokerNight' }] },
          {
            label: 'Not tonight. I will climb back myself',
            then: [
              { kind: 'setFlag', flag: 'turnedDownMarcus' },
              { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Proud. Fine. The chairs are not going anywhere.', 'Marcus: Neither am I.'] },
            ],
          },
        ],
      },
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
      {
        kind: 'choice',
        speaker: 'marcus',
        prompt: 'Play Marcus for it on the beach?',
        options: [
          { label: 'Deal me in', then: [{ kind: 'clearFlag', flag: 'turnedDownMarcus' }, { kind: 'startPokerNight' }] },
          {
            label: 'Not tonight. I will climb back myself',
            then: [
              { kind: 'setFlag', flag: 'turnedDownMarcus' },
              { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Suit yourself. The fish and I will be here.'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'marcus-deals-at-the-rail',
    about: 'Broke in Porto Lumina, with the match still to play: back to the kitchen table, at the rail.',
    trigger: { kind: 'talkTo', characterId: 'marcus' },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight' },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'eventDone', eventId: 'lumina-welcome' },
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
      {
        kind: 'choice',
        speaker: 'marcus',
        prompt: 'Win it back off Marcus first?',
        options: [
          { label: 'Deal me in', then: [{ kind: 'clearFlag', flag: 'turnedDownMarcus' }, { kind: 'startPokerNight' }] },
          {
            label: 'Not tonight. I will climb back myself',
            then: [
              { kind: 'setFlag', flag: 'turnedDownMarcus' },
              { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Your call. I am at the rail either way.'] },
            ],
          },
        ],
      },
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
      {
        kind: 'choice',
        speaker: 'marcus',
        prompt: 'Host the kitchen table?',
        options: [
          { label: 'Deal me in', then: [{ kind: 'clearFlag', flag: 'turnedDownMarcus' }, { kind: 'startPokerNight' }] },
          {
            label: 'Not tonight. I will climb back myself',
            then: [
              { kind: 'setFlag', flag: 'turnedDownMarcus' },
              { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: A penthouse and too proud to deal. You have changed.', 'Marcus: Not much, though.'] },
            ],
          },
        ],
      },
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
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'turnedDownMarcus' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'ray',
            lines: ['Ray: And Marcus says you would not even sit at his table. Did it on your own. I would have taken the table.'],
          },
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
      // Only ever set while you are still in Basin, so the chapter already says
      // this; it is the flag that tells this apart from Dana bringing you home
      // after the first game (`dana-walks-you-home`), which the chapter cannot
      // once that beat has moved you.
      { kind: 'flag', flag: 'marcusSeesYouOff', set: false },
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
        ],
      },
      {
        kind: 'choice',
        speaker: 'cass',
        prompt: 'Pay Cass back now?',
        options: [
          {
            label: 'Pay her back now',
            conditions: [{ kind: 'canPay', sponsorId: 'cass' }],
            then: [
              { kind: 'repay', sponsorId: 'cass' },
              { kind: 'dialogue', speaker: 'cass', lines: ['Cass: Early. Nobody pays early.', 'Cass: Dutch! Go and have your tea. This one is square.'] },
            ],
          },
          { label: 'Not yet', then: [{ kind: 'dialogue', speaker: 'cass', lines: ['Cass: Three days means three days.'] }] },
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
      {
        kind: 'choice',
        speaker: 'cass',
        prompt: 'Pay Cass what you owe?',
        options: [
          {
            label: 'Pay what I owe',
            conditions: [{ kind: 'canPay', sponsorId: 'cass' }],
            then: [
              { kind: 'repay', sponsorId: 'cass' },
              { kind: 'dialogue', speaker: 'cass', lines: ['Cass: Late. But here. Dutch! Tea.'] },
            ],
          },
          { label: 'I cannot. Not yet', then: [{ kind: 'dialogue', speaker: 'cass', lines: ['Cass: Then I would start running, love.'] }] },
        ],
      },
    ],
  },
  {
    id: 'cass-offers',
    about:
      'Meeting Cass: her rope, offered once and in person — take it or walk past. Kit, a town on, ' +
      'remembers which (`kit-harbor`), and the record keeps it.',
    trigger: { kind: 'interact', poiId: 'cass' },
    conditions: [
      { kind: 'debt', sponsorId: 'cass', status: 'none' },
      { kind: 'count', of: 'staked', sponsorId: 'cass', atMost: 0 },
      { kind: 'count', of: 'repaid', sponsorId: 'cass', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'cass',
        lines: [
          'Cass: You are the one Kit talks about. Kit talks about everybody.',
          'Cass: Fifteen hundred. Three days. A quarter on top. Dutch collects, and Dutch is family.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'cass',
        prompt: 'Take Cass’s money?',
        options: [
          {
            label: 'Take the $1,500',
            then: [
              { kind: 'takeStake', sponsorId: 'cass' },
              { kind: 'dialogue', speaker: 'cass', lines: ['Cass: Three days. Dutch will be by the bollard.'] },
            ],
          },
          {
            label: 'Not today',
            then: [{ kind: 'dialogue', speaker: 'cass', lines: ['Cass: Rope is free to look at. I am here when you want it.'] }],
          },
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
      {
        kind: 'choice',
        speaker: 'emeka',
        prompt: 'Pay Mr. Emeka back now?',
        options: [
          {
            label: 'Pay him back now',
            conditions: [{ kind: 'canPay', sponsorId: 'emeka' }],
            then: [
              { kind: 'repay', sponsorId: 'emeka' },
              { kind: 'dialogue', speaker: 'emeka', lines: ['Mr. Emeka: Before the day. I will tell Abel to sit down. He will not know how.'] },
            ],
          },
          { label: 'Not yet', then: [{ kind: 'dialogue', speaker: 'emeka', lines: ['Mr. Emeka: Then I shall go on being patient.'] }] },
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
      {
        kind: 'choice',
        speaker: 'emeka',
        prompt: 'Pay Mr. Emeka what you owe?',
        options: [
          {
            label: 'Pay what I owe',
            conditions: [{ kind: 'canPay', sponsorId: 'emeka' }],
            then: [
              { kind: 'repay', sponsorId: 'emeka' },
              { kind: 'dialogue', speaker: 'emeka', lines: ['Mr. Emeka: Late, and whole. Abel will be disappointed. He enjoys the thorough part.'] },
            ],
          },
          { label: 'I cannot. Not yet', then: [{ kind: 'dialogue', speaker: 'emeka', lines: ['Mr. Emeka: Abel will be very polite about it.'] }] },
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
      {
        kind: 'choice',
        speaker: 'Broker',
        prompt: 'Pay the Consortium back now?',
        options: [
          {
            label: 'Pay them back now',
            conditions: [{ kind: 'canPay', sponsorId: 'consortium' }],
            then: [
              { kind: 'repay', sponsorId: 'consortium' },
              { kind: 'dialogue', speaker: 'Broker', lines: ['Broker: Closed early. That is a first for this file.'] },
            ],
          },
          { label: 'Not yet', then: [{ kind: 'dialogue', speaker: 'Broker', lines: ['Broker: Your date stands.'] }] },
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
      {
        kind: 'choice',
        speaker: 'Broker',
        prompt: 'Pay the Consortium what you owe?',
        options: [
          {
            label: 'Pay what I owe',
            conditions: [{ kind: 'canPay', sponsorId: 'consortium' }],
            then: [
              { kind: 'repay', sponsorId: 'consortium' },
              { kind: 'dialogue', speaker: 'Broker', lines: ['Broker: The file closes. Mr. Lowe is informed.'] },
            ],
          },
          { label: 'I cannot. Not yet', then: [{ kind: 'dialogue', speaker: 'Broker', lines: ['Broker: Then the file opens wider.'] }] },
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
      {
        kind: 'choice',
        speaker: 'Madame Wen',
        prompt: 'Pay Madame Wen back now?',
        options: [
          {
            label: 'Pay her back now',
            conditions: [{ kind: 'canPay', sponsorId: 'wen' }],
            then: [
              { kind: 'repay', sponsorId: 'wen' },
              { kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Early. Ms. Fong will have to find another page to write small on.'] },
            ],
          },
          { label: 'Not yet', then: [{ kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Two days.'] }] },
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
      {
        kind: 'choice',
        speaker: 'Madame Wen',
        prompt: 'Pay Madame Wen what you owe?',
        options: [
          {
            label: 'Pay what I owe',
            conditions: [{ kind: 'canPay', sponsorId: 'wen' }],
            then: [
              { kind: 'repay', sponsorId: 'wen' },
              { kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Ms. Fong closes the book. You are one of the few.'] },
            ],
          },
          { label: 'I cannot. Not yet', then: [{ kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Then Ms. Fong keeps writing.'] }] },
        ],
      },
    ],
  },
  {
    id: 'wen-offers',
    about:
      'Meeting Madame Wen: the stake Kit begged you not to take, offered once — and Kit, after the match, ' +
      'knows which you chose (`kit-after-the-loss`, `kit-told-you`).',
    trigger: { kind: 'interact', poiId: 'wen' },
    conditions: [
      { kind: 'debt', sponsorId: 'wen', status: 'none' },
      { kind: 'count', of: 'staked', sponsorId: 'wen', atMost: 0 },
      { kind: 'count', of: 'repaid', sponsorId: 'wen', atMost: 0 },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'Madame Wen',
        lines: [
          'Madame Wen: A hundred and fifty thousand. Two days. Half again on top.',
          'Madame Wen: Enough for her buy-in and change. Everyone at your level considers it.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'Madame Wen',
        prompt: 'Take Madame Wen’s money?',
        options: [
          {
            label: 'Take the $150,000',
            then: [
              { kind: 'takeStake', sponsorId: 'wen' },
              { kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Ms. Fong has opened your page.'] },
            ],
          },
          {
            label: 'No. Kit warned me',
            then: [{ kind: 'dialogue', speaker: 'Madame Wen', lines: ['Madame Wen: Kit. Yes. Kit would know.'] }],
          },
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
  // over you; the shakedown follows the last line and costs everything you own
  // but a bus fare. The debt stays where it was.
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
          'Dutch: Pockets out for me? And the coat, and the keys. I will leave you bus fare. I always leave bus fare.',
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
        lines: ['Dutch: Again? I am starting to think we are friends.', 'Dutch: Same as last time. Pockets, coat, keys. Bus fare stays. The debt stays.'],
      },
    ],
  },
  {
    id: 'caught-by-abel',
    about: 'Mr. Emeka’s collector, the first time: perfectly polite, and he takes all of it.',
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
          'Abel: I will take everything you are carrying and everything you are wearing. A bus fare stays. He wants you able to find him.',
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
          'Mr. Lowe: Everything you carry, everything you own. The balance stands.',
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
          'Ms. Fong: Everything you own, entered against your page. The total has not moved.',
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

  // The final lost. There is no waiting: the back door, the friends in the way, and the
  // same table at the same deficit (`final-lost`). Nadia seats you again if you come to her.
  {
    id: 'nadia-rematch',
    about: 'Back after a loss: Nadia seats you again, at once, at the same deficit. Every loss comes back to this.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    repeatable: true,
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
          'Nadia: Same seat. Same stack. The cameras are still rolling. Sit down when you are ready.',
        ],
      },
      { kind: 'startTable', tableId: 'lumina-finale' },
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
        kind: 'if',
        when: [{ kind: 'flag', flag: 'cutDanaOff' }],
        then: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: You told me to stay away. I came anyway. You need to hear this.'] }],
      },
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
      {
        kind: 'if',
        when: [{ kind: 'flag', flag: 'turnedDownMarcus' }],
        then: [
          {
            kind: 'dialogue',
            speaker: 'dana',
            lines: ['Dana: The part she underlined was where you turned down Marcus’s table and climbed back without it.'],
          },
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
    about: 'Kit’s debt comes due on Kit: the Consortium’s men caught him, took everything, and the debt did not move.',
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
          'Kit: Listen, then, because I know this part. Skip town and they are waiting at the other end. Get caught and they take everything you own and leave the debt.',
          'Kit: Pay her first, then the match. Nadia waits a week. Wen does not wait at all.',
        ],
      },
    ],
  },
  {
    id: 'kit-squares-up',
    about: 'Aftermath, the debt arc’s end on the winning side, if you said no: Kit squared the Consortium himself.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'eventDone', eventId: 'kit-after' },
      { kind: 'flag', flag: 'stakedKit', set: false },
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
    id: 'kit-pays-you-back',
    about: 'Aftermath, if you staked him: Kit squares the Consortium on your money and pays you back doubled.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'flag', flag: 'stakedKit' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Twenty thousand. Your ten, and ten for being the only one who said yes.',
          'Kit: The Consortium is square. So are we. I hated every hand of it.',
        ],
      },
      { kind: 'giveCash', amount: 20000 },
      { kind: 'dialogue', speaker: 'kit', lines: ['Kit: Next year I am coming for the penthouse. Keep the chairs warm.'] },
    ],
  },
  {
    id: 'kit-after-hunted',
    about:
      'Aftermath, if you gave Kit to the collectors: he asks you for nothing.',
    trigger: { kind: 'talkTo', characterId: 'kit' },
    conditions: [
      { kind: 'flag', flag: 'stakedKit', set: false },
      { kind: 'eventDone', eventId: 'kit-after', done: false },
      { kind: 'chapter', cityId: 'portoLumina' },
      { kind: 'flag', flag: 'hasPenthouse' },
      { kind: 'flag', flag: 'tippedOffKit' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'kit',
        lines: [
          'Kit: Congratulations. I mean it. I know where I would be, if I were you.',
          'Kit: I will not be asking you for anything. Not now, not next year.',
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
  {
    id: 'prologue',
    about:
      'The opening: the televised final of the Legends Invitational, the lights failing, the ' +
      'bathroom, the mirror — and a cut back to the start of the run. Plays once, the first ' +
      'time a new game opens.',
    trigger: { kind: 'enterArea', areaId: 'home', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'flag', flag: 'metDana', set: false },
      { kind: 'eventDone', eventId: 'poker-night', done: false },
    ],
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Live from Porto Lumina',
        panels: [
          { scene: 'logo', lines: [] },
          {
            scene: 'booth',
            ticker: 'FINAL TABLE · PORTO LUMINA · 6 LEFT',
            lines: [
              {
                who: 'Chip',
                text:
                  'Good evening, and welcome to Porto Lumina, for the final table of the ' +
                  'Legends Invitational! Six players left, one winner, and the keys to the ' +
                  'penthouse!',
              },
              {
                who: 'Dr. Anand',
                text:
                  'I am Dr. Priyanka Anand, that is Chip, and the prize is seven hundred and ' +
                  'fifty thousand dollars. We are live.',
              },
              {
                who: 'Chip',
                text:
                  'And there he is — in the orange jacket, seat six, the shortest stack at the ' +
                  'table. That is our player, folks! Show them in!',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Seven big blinds. I have run the numbers and I would like to apologise in ' +
                  'advance.',
              },
            ],
          },
        ],
      },
      {
        kind: 'cinematic',
        id: 'bad-beat',
      },
      {
        kind: 'reel',
        title: 'The Legends Invitational',
        panels: [
          {
            scene: 'booth',
            ticker: 'TECHNICAL DIFFICULTY · PLEASE STAND BY',
            lines: [
              {
                who: 'Dr. Anand',
                text:
                  'We are experiencing a technical difficulty. The rig has tripped. Do not ' +
                  'adjust your set.',
              },
              {
                who: 'Chip',
                text:
                  'Play is suspended, folks, for fifteen minutes. Our player has, I believe, ' +
                  'left the table.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'He has gone to the bathroom. At a final table. With four hundred thousand ' +
                  "dollars of other people's money riding on a river card.",
              },
            ],
          },
          {
            scene: 'corridor',
            caption: 'The back corridor. Somewhere behind you, the crew is shouting about a fuse.',
            lines: [
              {
                who: 'You',
                text: 'Do not run. Whatever you do, do not run. People are watching you leave.',
              },
              {
                who: 'You',
                text:
                  "Four hundred thousand in other people's money, and I am walking toward the " +
                  "men's room like it is a plan.",
              },
            ],
          },
          {
            scene: 'bathroom',
            caption:
              "The men's room, Porto Lumina. A fluorescent tube hums. Somebody, somewhere, is " +
              'applauding a sandwich.',
            lines: [
              {
                who: 'You',
                text:
                  'Breathe. It is one hand. It is one hand. It is the one hand that decides ' +
                  'everything.',
              },
              {
                who: 'You',
                text:
                  'Cass wants her money. Mr. Emeka wants his money and also a handshake. The ' +
                  'Consortium wants a word.',
              },
              {
                who: 'You',
                text: "Wen's people are in the lobby. They sent a fruit basket. It had a card.",
              },
            ],
          },
          {
            scene: 'phone',
            notifications: [
              { from: '3 MISSED CALLS', text: 'Cass, Mr. Emeka' },
              { from: 'UNKNOWN', text: 'WE SEE YOU.' },
              { from: 'MARCUS', text: 'You got this. Also, my hoodie.' },
            ],
            caption: 'Three missed calls. A text from an unknown number: "WE SEE YOU."',
            lines: [
              { who: 'You', text: 'The fruit basket has a tracker in it. I am almost sure.' },
              {
                who: 'Phone',
                text: 'MARCUS: You got this. Also, did you take my hoodie. No pressure.',
              },
            ],
          },
          {
            scene: 'mirror',
            lines: [
              { who: 'You', text: 'Look at you.' },
              { who: 'You', text: 'Seven big blinds. A broadcast crew. A fruit basket.' },
              { who: 'You', text: 'How... how did I get here?' },
            ],
          },
        ],
      },
      { kind: 'wait', ms: 500 },
      {
        kind: 'reel',
        title: 'Some time earlier',
        panels: [
          {
            scene: 'night',
            caption: 'Basin. A flat above a bakery. Some time earlier.',
            lines: [
              {
                who: 'You',
                text: 'It started small. A note on a table. A rent that did not pay itself.',
              },
            ],
          },
          {
            scene: 'mail',
            lines: [
              {
                who: 'You',
                text:
                  'Nine days. Nine days, forty dollars and a fridge that hums a different note ' +
                  'every night.',
              },
              {
                who: 'You',
                text:
                  'Marcus. Of course it is Marcus. He has never once been wrong about a bad ' +
                  'idea.',
              },
            ],
          },
        ],
      },
      // Back from the mail: at the kitchen table where you read it, not at the door.
      { kind: 'teleport', areaId: 'home', col: 4, row: 5 },
      { kind: 'fade', to: 'in' },
      // After the film, or after skipping it: how to play, once, in one line.
      {
        kind: 'dialogue',
        lines: ['Arrow keys or WASD to walk. Space to talk (or tap). Esc opens the menu, and Jobs there says what to do next.'],
      },
    ],
  },
  {
    id: 'tournament-registrar-closed',
    about: 'The desk after you have won the floor: the seat is yours, go and see Nadia.',
    trigger: { kind: 'interact', poiId: 'lumina-tournament-desk' },
    repeatable: true,
    conditions: [{ kind: 'flag', flag: 'wonTournament' }],
    actions: [
      {
        kind: 'dialogue',
        lines: ['Registrar: The tournament is over, and you won it. Your seat is at the Invitational. Ms. Okonkwo is by the door.'],
      },
    ],
  },
  {
    id: 'tournament-lost',
    about:
      'Knocked out of the tournament: the entry is gone and the desk will take another, from round one. ' +
      'Plays every time.',
    trigger: { kind: 'tournamentLost' },
    repeatable: true,
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Knocked out',
        panels: [
          {
            scene: 'booth',
            ticker: 'POKER LEGENDS · ELIMINATED',
            lines: [
              { who: 'Chip', text: 'And that is the end of the road for our challenger, folks! The cards have spoken!' },
              { who: 'Dr. Anand', text: 'The tournament is a hundred hands long. Variance is not. I would only say: it is twenty thousand to find out again.' },
            ],
          },
        ],
      },
      { kind: 'fade', to: 'in' },
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: The desk is at the back. Round one is at the top of the hour.',
          'Nadia: Everybody who has sat in that seat has lost it once. The ones I remember lost it twice.',
        ],
      },
    ],
  },
  {
    id: 'tournament-won',
    about:
      'The floor is won and the table is announced as the final one: four hands of the Invitational played out on ' +
      'the broadcast (`slide`: two good, two bad, down to 90,000), then the opening\'s own bad beat (aces against the ' +
      'flush) down to 15,000 and the lights going out; then the corridor and the men\'s room, where ' +
      'Marcus finds you and talks you back into the chair; the broadcast comes back on and you play ' +
      'the Invitational\'s final table with the 15,000. Where the opening prologue left off.',
    trigger: { kind: 'tournamentWon' },
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Live from Porto Lumina',
        panels: [
          { scene: 'logo', lines: [] },
          {
            scene: 'booth',
            ticker: 'FINAL TABLE · YOU 100,000 · 6 LEFT',
            lines: [
              { who: 'Chip', text: 'The floor is won and the seat is taken, folks! Six players, one hundred thousand each for our challenger, and the keys to the penthouse!' },
              { who: 'Dr. Anand', text: 'He has bought in at the Invitational on the strength of a hundred hands. I will be watching the stacks, not the story.' },
            ],
          },
        ],
      },
      // The first hour of the final, hand by hand on the broadcast: two good, two bad, down to ninety thousand.
      { kind: 'cinematic', id: 'slide' },
      // And then the hand the game opened on: aces against the flush, the lights going, you on your feet.
      { kind: 'cinematic', id: 'bad-beat' },
      {
        kind: 'reel',
        panels: [
          {
            scene: 'corridor',
            caption: 'The back corridor. Somewhere behind you, the crew is shouting about a fuse.',
            lines: [
              { who: 'You', text: 'Do not run. Whatever you do, do not run. People are watching you leave.' },
              { who: 'You', text: "A hundred thousand, and fifteen of it left, and I am walking toward the men's room like it is a plan." },
            ],
          },
          {
            scene: 'bathroom',
            caption: 'The men\'s room, Porto Lumina. A fluorescent tube hums. Play is suspended for fifteen minutes.',
            lines: [
              { who: 'You', text: 'A hundred thousand. A hundred thousand dollars of somebody else\'s hope, and I have fifteen of it left.' },
              { who: 'You', text: 'I was good. For twelve hands I was the best player in the building. What did I do?' },
              { who: 'You', text: 'Nine days ago I was a man with forty dollars and a fridge that hums. Maybe that was the real me, and this is the lie.' },
            ],
          },
          {
            // The same room, you already at the sink: not the walk in again.
            scene: 'sink',
            caption: 'The door swings. Somebody is wearing a sports jacket to a men\'s room, and has brought a paper cup.',
            lines: [
              { who: 'marcus', text: 'Marcus: There he is. I told the usher I was your uncle. He asked which side and I said the loud side.' },
              { who: 'marcus', text: 'Marcus: Listen. Nobody in that room has been at my kitchen table. Nobody. You have beaten a man who had never lost with a pair of nothing, and he cried.' },
              { who: 'marcus', text: 'Marcus: Fifteen thousand is not nothing. It is seven big blinds, and you have never needed more than a good first night and a bad idea.' },
              { who: 'marcus', text: 'Marcus: Go and sit down. Be a story I can tell. And if it goes wrong, the kitchen table is still in my kitchen.' },
              { who: 'You', text: 'Marcus. Is that a paper cup of water, or of vodka?' },
              { who: 'marcus', text: 'Marcus: Water. I am not an animal. Drink it. Wash your face. Go.' },
            ],
          },
          {
            scene: 'booth',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              { who: 'Chip', text: 'The lights are back, folks! The rig is fixed, and the short stack returns to the table!' },
              { who: 'Dr. Anand', text: 'We are back live. Fifteen thousand against a combined seven hundred and twenty thousand. I would say the odds are long.' },
              { who: 'Chip', text: 'The odds, Doctor, are a suggestion. Deal the cards!' },
            ],
          },
        ],
      },
      { kind: 'startTable', tableId: 'lumina-finale' },
    ],
  },
  {
    id: 'final-table-start',
    about:
      'Sitting down for the final when you come to Nadia with the seat already won (the walk ' +
      'there from `tournament-won` was interrupted, or you left the table): the lights come ' +
      'back on in the studio, the commentators recap who you scouted, and you take the seat — ' +
      'at 7 big blinds, with the whole table ahead of you. Repeatable, so Not yet is allowed.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    repeatable: true,
    conditions: [
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'flag', flag: 'wonTournament' },
      { kind: 'challenge', status: 'unplayed' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: The final is at nine. You won the floor, so you have the seat. The seat is the one at the end.',
          'Nadia: You will be the short stack. That is not an insult. That is the arithmetic.',
        ],
      },
      {
        kind: 'choice',
        speaker: 'nadia',
        prompt: 'Take your seat?',
        options: [
          {
            label: 'Take it',
            then: [
              { kind: 'fade', to: 'out' },
              {
                kind: 'reel',
                title: 'Back in the building',
                panels: [
                  {
                    scene: 'booth',
                    ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
                    lines: [
                      {
                        who: 'Chip',
                        text:
                          'The lights are back, folks! The rig is fixed and the short stack ' +
                          'returns!',
                      },
                      {
                        who: 'Dr. Anand',
                        text:
                          'He has been in the bathroom for fifteen minutes. I have a hypothesis ' +
                          'about that and it is not flattering.',
                      },
                      {
                        who: 'Chip',
                        text:
                          'We are back live. Five opponents and a very short stack. Seven big ' +
                          'blinds. Do the maths, Doctor.',
                      },
                      {
                        who: 'Dr. Anand',
                        text:
                          'Fifteen thousand. Against a combined stack of seven hundred and ' +
                          'twenty thousand. I would say the odds are long.',
                      },
                    ],
                  },
                ],
              },
              {
                kind: 'if',
                when: [
                  { kind: 'flag', flag: 'scoutedGaines' },
                ],
                then: [
                  {
                    kind: 'reel',
                    panels: [
                      {
                        scene: 'booth',
                        ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
                        lines: [
                          {
                            who: 'Dr. Anand',
                            text:
                              'He knows the Reverend folds to river pressure. He knows the ' +
                              'Contessa overplays. He knows Bernard calls everything.',
                          },
                          {
                            who: 'Chip',
                            text: 'Does he know what any of that is worth with seven big blinds?',
                          },
                          {
                            who: 'Dr. Anand',
                            text:
                              'It is worth exactly what he does with it. That is the whole game.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              { kind: 'startTable', tableId: 'lumina-finale' },
            ],
          },
          {
            label: 'Not yet',
            then: [
              {
                kind: 'dialogue',
                speaker: 'nadia',
                lines: ['Nadia: Everyone needs a minute. Take two. Not three.'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'final-lost',
    about:
      "Out of chips at the final: you run out the back door down the alley with the sponsors' people on your " +
      'heels, then a Play again screen puts you back at the same table with 15,000. Plays every time the ' +
      'table is lost.',
    trigger: { kind: 'finaleLost' },
    repeatable: true,
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Bust',
        panels: [
          {
            scene: 'booth',
            ticker: 'ELIMINATED · 6TH PLACE',
            lines: [
              {
                who: 'Chip',
                text:
                  'And that is it, folks! Our short stack is felted, all in and called, and the ' +
                  'rail goes quiet.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Statistically, this was the most likely outcome. I take no pleasure in being ' +
                  'right.',
              },
            ],
          },
          {
            scene: 'chase',
            lines: [
              {
                who: 'You',
                text: 'The staff door, the loading dock. The air smells of fryer oil and consequences.',
              },
              {
                who: 'You',
                text:
                  'Four of them. Four men in suits, in the foyer. They did not bring a fruit ' +
                  'basket this time.',
              },
              { who: 'You', text: 'Run.' },
            ],
          },
        ],
      },
      // Out of the alley and out of chips. One screen, one button, and you are back at the table with 15,000.
      { kind: 'cinematic', id: 'retry' },
      { kind: 'startTable', tableId: 'lumina-finale' },
    ],
  },
  {
    id: 'final-won',
    about:
      'The last chip is yours. The ending film plays (the empty stage, the settlement, the ' +
      'petition, the credits, a missed call), then you come to in the penthouse, Dana rings with the one line after it, and ' +
      'open-ended play begins. Playable on demand from the playtest panel.',
    trigger: { kind: 'finaleWon' },
    actions: [
      // The penthouse is the prize, however the film is reached (the playtest panel plays it on demand).
      { kind: 'setFlag', flag: 'hasPenthouse' },
      { kind: 'setFlag', flag: 'beatFinalRival' },
      {
        kind: 'if',
        when: [
          { kind: 'flag', flag: 'clueWatch' },
          { kind: 'flag', flag: 'clueRing' },
          { kind: 'flag', flag: 'clueRope' },
          { kind: 'flag', flag: 'clueTable' },
          { kind: 'flag', flag: 'clueConsortium' },
          { kind: 'flag', flag: 'clueScout' },
        ],
        then: [
          {
            kind: 'dialogue',
            speaker: 'nadia',
            lines: [
              'Nadia: Well played. Nobody can say I lost it on purpose. Not Wen, not the room.',
              'Nadia: Marcus still has my watch, I hear. Under a sugar bowl. Tell him he can keep it.',
              'Nadia: Now you know what comes with the room. Wen holds the paper. It is not a gift, it is a ledger.',
            ],
          },
          {
            kind: 'choice',
            speaker: 'nadia',
            prompt: 'What do you do about Wen’s paper?',
            options: [
              {
                label: 'Settle it from the prize',
                then: [
                  { kind: 'setFlag', flag: 'penthouseSettled' },
                  {
                    kind: 'dialogue',
                    speaker: 'nadia',
                    lines: [
                      'Nadia: Then it is yours and nobody else’s. You will not feel what it cost until the statement comes.',
                    ],
                  },
                ],
              },
              {
                label: 'Leave it with Wen',
                then: [
                  { kind: 'setFlag', flag: 'penthouseWen' },
                  {
                    kind: 'dialogue',
                    speaker: 'nadia',
                    lines: [
                      'Nadia: Then you keep the keys and she keeps the pen. Mind the hours she calls.',
                    ],
                  },
                ],
              },
              {
                label: 'Open a stake fund in the room’s name',
                then: [
                  { kind: 'setFlag', flag: 'penthouseFund' },
                  {
                    kind: 'dialogue',
                    speaker: 'nadia',
                    lines: [
                      'Nadia: A stake for the next one who is short. Kit would laugh. Then he would ask for a loan.',
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { kind: 'fade', to: 'out' },
      { kind: 'cinematic', id: 'ending' },
      // After the credits you are home: forty-one floors up, by the lift.
      { kind: 'teleport', areaId: 'pl-penthouse', col: 12, row: 3 },
      { kind: 'fade', to: 'in' },
      {
        kind: 'dialogue',
        speaker: 'dana',
        lines: [
          'The phone buzzes on the glass table. It is Dana.',
          'Dana: I put it in the book as a win. It is the only column I have.',
          'Dana: Marcus called me. He did not ask where you were. He asked if you were eating.',
          'Dana: Call him back. I am not going to say it twice.',
        ],
      },
    ],
  },
]

// The errands are written as data in `errands.ts` and expanded into ordinary events.
EVENTS.push(...ERRAND_EVENTS)
