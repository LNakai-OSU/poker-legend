import type { Rng } from './rng'

/**
 * A tournament at one table: rounds of a fixed number of hands, blinds going up
 * at the start of each, and — until the last round is over — a knocked-out player
 * is replaced by somebody new, so the table never thins. Then it is the final
 * table: the same six, no more replacements, played to one winner.
 */
export interface TournamentRules {
  /** Rounds before the table is announced as the final table. */
  rounds: number
  handsPerRound: number
  /** Small and big blind for each round, in order. A round past the end of the list keeps raising. */
  blinds: ReadonlyArray<readonly [number, number]>
}

/** Which round (1-based) the next hand to be dealt belongs to, given how many have been played. */
export function roundOfNextHand(rules: TournamentRules, handsPlayed: number): number {
  return Math.floor(handsPlayed / rules.handsPerRound) + 1
}

/** The blinds for a round. Past the schedule they keep climbing by half again, so a final table always ends. */
export function blindsForRound(rules: TournamentRules, round: number): { small: number; big: number } {
  const last = rules.blinds.length - 1
  if (round - 1 <= last) {
    const [small, big] = rules.blinds[Math.max(0, round - 1)]
    return { small, big }
  }
  let [small] = rules.blinds[last]
  for (let r = last + 1; r < round; r++) small = roundToNice(small * 1.5)
  return { small, big: small * 2 }
}

/** True once the rounds are all played and the table becomes the final one. */
export function isFinalTable(rules: TournamentRules, handsPlayed: number): boolean {
  return handsPlayed >= rules.rounds * rules.handsPerRound
}

/**
 * The stack a newcomer sits down with: near what the table is playing with, never
 * so short that they are dead on arrival, never a mountain.
 *
 * `others` is everybody still in. Between half and one and a half times their
 * average, rounded to the big blind; at least ten big blinds, at most three times
 * the average, so the stage of the tournament decides how big the stack is.
 */
export function replacementStack(rng: Rng, others: readonly number[], bigBlind: number): number {
  const live = others.filter((s) => s > 0)
  const average = live.length > 0 ? live.reduce((a, b) => a + b, 0) / live.length : bigBlind * 20
  const raw = average * (0.5 + rng())
  const clamped = Math.min(Math.max(raw, bigBlind * 10), Math.max(average * 3, bigBlind * 10))
  return Math.max(bigBlind * 10, Math.round(clamped / bigBlind) * bigBlind)
}

function roundToNice(n: number): number {
  const step = n >= 1000 ? 100 : 50
  return Math.round(n / step) * step
}
