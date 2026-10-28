import type { TimePeriod } from '../game/time'
import type { StoryFlag } from './flags'
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
  | 'rail'
  | 'night'

/** The scripted scenes `cinematic` can play. */
export type CinematicId = 'bad-beat'

/** One thing said in a reel. `who` is a character id or a plain name, such as a commentator. */
export interface ReelLine {
  who: string
  text: string
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
        if (other.id !== carrier.id && canBothFire(underWay, other)) clashes.push([carrier, other])
      }
    }
  }
  return clashes
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
  // The opening. The first time you step out of your door, Dana runs up the
  // street to catch you, walks you to the 14 and rides it with you to Marcus's
  // block, so the run starts at his door rather than wherever you wandered.
  // Anybody who gets as far as the depot without her (a save from before this
  // was written) is met there instead. docs/STORYBOARD.md, Act 0.
  {
    id: 'dana-walks-you-to-the-bus',
    about:
      'The opening: Dana runs to catch you outside your door, walks you to the depot and rides the 14 with ' +
      'you to Marcus’s door. How you answer her is remembered (`dana-reveal`).',
    trigger: { kind: 'enterArea', areaId: 'basin', onLoad: true },
    conditions: [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'eventDone', eventId: 'poker-night', done: false },
      { kind: 'flag', flag: 'metDana', set: false },
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
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: The 14 goes from the depot. Walk with me.'] },
      { kind: 'moveNpc', characterId: 'dana', to: { col: 26, row: 7 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'depot', col: 6, row: 2, with: ['dana'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'dana', lines: ['Dana: There. Get on. I am going your way.'] },
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
      { kind: 'startPokerNight' },
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
        ],
      },
      { kind: 'dialogue', lines: ['Silver Creek. A casino at the end of the reservation road, and a dollar-two game inside it.'] },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Smell that? Carpet and cigarettes. Real poker.'] },
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 16, row: 5 }, youFollow: true },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'sc-floor', col: 10, row: 9, with: ['marcus'] },
      { kind: 'fade', to: 'in' },
      { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: Pit boss, top left. He seats the low-stakes table. A hundred to sit.'] },
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
      { kind: 'moveNpc', characterId: 'marcus', to: { col: 10, row: 11 }, leaves: true },
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
      { kind: 'teleport', areaId: 'sc-floor', col: 10, row: 10 },
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
        ],
      },
      {
        kind: 'if',
        when: [{ kind: 'eventDone', eventId: 'marcus-rides-out-with-you' }],
        then: [{ kind: 'dialogue', speaker: 'ray', lines: ['Ray: Saw your friend walk you in. Overalls. Hang on to him. This room eats friends.'] }],
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
      { kind: 'teleport', areaId: 'rb-boat', col: 11, row: 9 },
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
      { kind: 'teleport', areaId: 'ch-cardroom', col: 10, row: 11 },
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
      { kind: 'teleport', areaId: 'pc-casino', col: 10, row: 11 },
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
      { kind: 'teleport', areaId: 'nm-casino', col: 11, row: 12 },
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
    about: 'Arriving at Porto Lumina: the nosebleed, the match, and the man who photographs the winner. Then you walk in to its table.',
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
      // "Let's go" means in: off the last line you walk to the door of the casino
      // and through it, rather than being left at the stop to find it.
      { kind: 'movePlayer', to: { col: 15, row: 6 } },
      { kind: 'fade', to: 'out' },
      { kind: 'teleport', areaId: 'pl-casino', col: 10, row: 10 },
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
      'has been writing to her about you, and she sends a car for Marcus. What you ask her is ' +
      'heard again by Dana (`dana-reveal`) and Marcus (`marcus-at-the-rail`).',
    trigger: { kind: 'interact', poiId: 'nadia' },
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: So you are the one from the kitchen table in Basin.',
          'Nadia: Somebody I trust has been writing to me about you since Marcus’s game.',
          'Nadia: Tonight is the final table of the Legends Invitational. Six chairs, one winner, and the floor upstairs goes with the trophy.',
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
      { kind: 'dialogue', speaker: 'nadia', lines: ['Nadia: Come back when you are ready. You will know.'] },
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
    ],
  },
  {
    id: 'kit-after',
    about: 'Aftermath: the rival asks the winner for a stake. You are the sponsor now, and it is your call.',
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
      'The way back from broke: below the cheapest seat on the ladder, Marcus offers the kitchen table ' +
      'again — the same game that started the run — and you can say no and climb back alone. Wherever the story has got to.',
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
      { kind: 'eventDone', eventId: 'kit-after' },
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
      { kind: 'teleport', areaId: 'home', col: 3, row: 5 },
      { kind: 'fade', to: 'in' },
    ],
  },
  {
    id: 'final-table-start',
    about:
      'Sitting down for the final: the lights come back on in the studio, the commentators ' +
      'recap who you scouted, and you take the seat — at 7 big blinds, with the whole table ' +
      'ahead of you. Repeatable, so Not yet is allowed.',
    trigger: { kind: 'interact', poiId: 'nadia' },
    repeatable: true,
    conditions: [
      { kind: 'eventDone', eventId: 'nadia-names-the-match' },
      { kind: 'flag', flag: 'hasPenthouse', set: false },
      { kind: 'cashAtLeast', amount: 120000 },
      { kind: 'challenge', status: 'unplayed' },
    ],
    actions: [
      {
        kind: 'dialogue',
        speaker: 'nadia',
        lines: [
          'Nadia: The final is at nine. You have the proof of funds, so you have the seat. The seat is the one at the end.',
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
                    scene: 'studio',
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
      "Out of chips at the final: you run out the back door, the sponsors' people on your " +
      'heels, and the friends you made on the way get in their way. Then you go back in at the ' +
      'same deficit. Plays every time the table is lost.',
    trigger: { kind: 'finaleLost' },
    repeatable: true,
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Bust',
        panels: [
          {
            scene: 'studio',
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
            scene: 'alley',
            caption:
              'The staff door, the loading dock. The air smells of fryer oil and consequences.',
            lines: [
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
      {
        kind: 'choice',
        prompt: 'How do you get out?',
        options: [
          {
            label: 'The fire stairs',
            then: [
              {
                kind: 'reel',
                panels: [
                  {
                    scene: 'alley',
                    lines: [
                      {
                        who: 'You',
                        text:
                          'Up three flights. Down three flights. I forget which way I was going.',
                      },
                      {
                        who: 'marcus',
                        text:
                          'Marcus: Left! No — your left! — I am blocking the door with a ' +
                          'banquet chair. I have been blocking things since 1998.',
                      },
                      { who: 'Mr. Lowe', text: 'Mr. Lowe: Sir, that is a fire exit.' },
                      { who: 'marcus', text: 'Marcus: Then it is a very well-attended one.' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            label: 'Through the kitchen',
            then: [
              {
                kind: 'reel',
                panels: [
                  {
                    scene: 'alley',
                    lines: [
                      { who: 'You', text: 'Pans. Steam. A man shouting about a béarnaise.' },
                      {
                        who: 'dana',
                        text:
                          'Dana: They went that way. I said it in four languages. One of them ' +
                          'was Latin.',
                      },
                      { who: 'Dutch', text: 'Dutch: She is lying. I can tell. Is she lying?' },
                      {
                        who: 'dana',
                        text: 'Dana: Yes. But you will take a very long time to decide.',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            label: 'Straight out, tip the doorman',
            then: [
              {
                kind: 'reel',
                panels: [
                  {
                    scene: 'alley',
                    lines: [
                      {
                        who: 'You',
                        text:
                          'A twenty to the doorman. He looks at the twenty. He looks at me. He ' +
                          'looks at the twenty.',
                      },
                      {
                        who: 'hal',
                        text:
                          'Hal: Gentlemen. A word on pot odds. It will take about forty minutes.',
                      },
                      { who: 'Ms. Fong', text: 'Ms. Fong: We have a schedule, sir.' },
                      { who: 'hal', text: 'Hal: So did Custer.' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        kind: 'if',
        when: [
          { kind: 'flag', flag: 'stakedKit' },
        ],
        then: [
          {
            kind: 'reel',
            panels: [
              {
                scene: 'alley',
                lines: [
                  { who: 'kit', text: 'Kit: I owe you for the stake. This is me paying in kind.' },
                  {
                    who: 'kit',
                    text:
                      "Kit: Do not look back. I have wrecked a lot of people's evenings. I am " +
                      'very good at it.',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        kind: 'reel',
        title: 'Back in',
        panels: [
          {
            scene: 'rail',
            caption:
              'A hand on the back of your jacket, and the loading dock door swings open on the ' +
              'light.',
            lines: [
              {
                who: 'marcus',
                text:
                  'Marcus: They have not called your name. Go back in. The seat is still warm. ' +
                  'It is also, technically, still yours.',
              },
              {
                who: 'Dolores',
                text: 'Dolores: Rub the foot, honey. For luck. Do not tell the foot I said so.',
              },
              {
                who: 'dana',
                text: 'Dana: Seven big blinds. You have done more with less. Probably.',
              },
            ],
          },
          {
            scene: 'studio',
            ticker: 'YOU 15,000 · 7 BB · LAST OF 6',
            lines: [
              {
                who: 'Chip',
                text: 'And what is this! The short stack is BACK! He has returned to the table!',
              },
              {
                who: 'Dr. Anand',
                text:
                  'I will say, with some professional reluctance, that this is not in the rules.',
              },
              {
                who: 'Chip',
                text: 'The rules, Doctor, are a suggestion. Fifteen thousand. Deal the cards!',
              },
            ],
          },
        ],
      },
      { kind: 'startTable', tableId: 'lumina-finale' },
    ],
  },
  {
    id: 'final-won',
    about:
      'The last chip is yours. The commentators lose it, the rail is on its feet, and the ' +
      'credits roll — then the ending card, and open-ended play.',
    trigger: { kind: 'finaleWon' },
    actions: [
      { kind: 'fade', to: 'out' },
      {
        kind: 'reel',
        title: 'Champion',
        panels: [
          {
            scene: 'studio',
            ticker: 'WINNER · LEGENDS INVITATIONAL · $750,000',
            lines: [
              {
                who: 'Chip',
                text:
                  'IT IS OVER! FROM SEVEN BIG BLINDS TO EVERY CHIP ON THE TABLE! I HAVE NEVER ' +
                  'SEEN ANYTHING LIKE IT IN MY LIFE!',
              },
              {
                who: 'Dr. Anand',
                text:
                  'That is a lie, Chip, we both watched the same thing in Tahoe in 2019. But I ' +
                  'will grant you this is better.',
              },
              {
                who: 'Dr. Anand',
                text:
                  'Nineteen percent, three times in a row. I need to sit down. I am sitting ' +
                  'down. I am standing up again.',
              },
            ],
          },
          {
            scene: 'rail',
            caption: 'The rail comes over the ropes.',
            lines: [
              {
                who: 'marcus',
                text:
                  'Marcus: THE KITCHEN TABLE STILL STANDS! I SAID IT WOULD! I SAID IT IN BASIN!',
              },
              {
                who: 'dana',
                text: 'Dana: I did not write this one down. Some things you only get to see once.',
              },
              { who: 'Dolores', text: 'Dolores: Told you. The foot knew. The foot always knows.' },
            ],
          },
          {
            scene: 'night',
            caption: 'Porto Lumina, forty-one floors up, a long time after the cameras go dark.',
            lines: [
              { who: 'You', text: 'The lights are on. For once I do not need them.' },
              { who: 'You', text: 'Somewhere a fruit basket is being very, very polite.' },
            ],
          },
        ],
      },
      {
        kind: 'reel',
        title: 'Credits',
        panels: [
          {
            scene: 'night',
            caption: 'POKER LEGEND',
            lines: [
              { who: 'THE SHORT STACK', text: 'You' },
              { who: 'THE KITCHEN TABLE', text: 'Marcus' },
              { who: 'THE WATCHER', text: 'Dana' },
              { who: 'THE ONE WHO WAS DUE', text: 'Ray' },
              { who: 'THE FOOT', text: 'Lucky Dolores' },
              { who: 'THE TITHE', text: 'Reverend Gaines' },
              { who: 'THE ACCENT', text: 'The Contessa' },
              { who: 'THE THURSDAY', text: 'Bernard' },
              { who: 'THE CHAT', text: 'Zeke "KingPin"' },
              { who: 'THE COACH WHO NEVER SOLD THE LAST LESSON', text: 'Hal' },
              { who: 'THE FIVE-SECOND MIRACLE', text: 'Chip Van Doren' },
              { who: 'THE APOLOGY FOR THE MATHS', text: 'Dr. Priyanka Anand' },
              { who: 'THE FINAL BOSS', text: 'Nadia Okonkwo' },
              { who: 'THE FRUIT BASKET', text: 'Nobody will say who sent it' },
              { who: 'THANK YOU FOR PLAYING', text: 'Now go home. Tell somebody you won.' },
            ],
          },
        ],
      },
    ],
  },
]
