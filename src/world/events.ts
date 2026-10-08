import type { TimePeriod } from '../game/time'
import type { GameState, StoryFlag } from '../game/state'

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
  }
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
    return (event.conditions ?? []).every((condition) => conditionHolds(condition, state))
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
    conditions: [{ kind: 'flag', flag: 'wonPokerNight' }],
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
    ],
  },
]
