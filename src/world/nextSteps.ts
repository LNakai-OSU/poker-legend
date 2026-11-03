import { allHold, type EventCondition } from './events'
import type { GameState } from '../game/state'

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
}

const gameNotPlayed: EventCondition = { kind: 'eventDone', eventId: 'poker-night', done: false }
const gamePlayed: EventCondition = { kind: 'eventDone', eventId: 'poker-night' }

export const NEXT_STEPS: NextStep[] = [
  {
    id: 'go-outside',
    // A new game, after the film: Dana is at the end of your street.
    when: [{ kind: 'flag', flag: 'metDana', set: false }, gameNotPlayed],
    line: 'Go outside. Someone is looking for you.',
  },
  {
    id: 'dana-at-the-stop',
    // You told Dana you had a stop to make first (`dana-walks-you-to-the-bus`).
    when: [{ kind: 'flag', flag: 'metDana' }, { kind: 'flag', flag: 'danaAtTheStop' }, gameNotPlayed],
    line: 'Dana is waiting at the bus stop: east along Seventh Street, at the depot. The 14 goes to Marcus’s game.',
  },
  {
    id: 'marcus-game',
    when: [{ kind: 'flag', flag: 'metDana' }, { kind: 'flag', flag: 'danaAtTheStop', set: false }, gameNotPlayed],
    line: 'Marcus’s game: north of the bus depot in Eastgate, the middle door. Talk to Marcus to sit down.',
  },
  {
    id: 'deal-again',
    // Up from his table without the money (`poker-night-lost`).
    when: [gamePlayed, { kind: 'flag', flag: 'wonPokerNight', set: false }],
    line: 'Marcus will deal you back in: Eastgate, the middle door, any time from the afternoon. Talk to him.',
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
  },
]

/** The line the Jobs page leads with, or null once a town's goal is doing that. */
export function nextStep(state: GameState): string | null {
  return NEXT_STEPS.find((step) => allHold(step.when, state))?.line ?? null
}
