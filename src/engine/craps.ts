import type { Rng } from './rng'

/**
 * Pass line craps with the real rules, which is what makes the 1.41% house
 * edge fall out on its own:
 *   come-out  — 7 or 11 wins, 2/3/12 loses, anything else sets the point
 *   point     — rolling the point again wins, a 7 loses, anything else re-rolls
 */
export type CrapsPhase = 'come-out' | 'point'

export interface DiceRoll {
  a: number
  b: number
  total: number
}

export interface CrapsState {
  phase: CrapsPhase
  point: number | null
}

export type CrapsOutcome = 'win' | 'lose' | 'continue'

export interface CrapsStep {
  roll: DiceRoll
  state: CrapsState
  outcome: CrapsOutcome
  message: string
}

export function newCrapsState(): CrapsState {
  return { phase: 'come-out', point: null }
}

export function rollDice(rng: Rng): DiceRoll {
  const a = 1 + Math.floor(rng() * 6)
  const b = 1 + Math.floor(rng() * 6)
  return { a, b, total: a + b }
}

export function resolveRoll(state: CrapsState, roll: DiceRoll): CrapsStep {
  if (state.phase === 'come-out') {
    if (roll.total === 7 || roll.total === 11) {
      return { roll, state: newCrapsState(), outcome: 'win', message: `${roll.total} — natural, pass line wins.` }
    }
    if (roll.total === 2 || roll.total === 3 || roll.total === 12) {
      return { roll, state: newCrapsState(), outcome: 'lose', message: `${roll.total} — craps, pass line loses.` }
    }
    return {
      roll,
      state: { phase: 'point', point: roll.total },
      outcome: 'continue',
      message: `Point is ${roll.total}. Roll it again before a 7.`,
    }
  }

  if (roll.total === state.point) {
    return { roll, state: newCrapsState(), outcome: 'win', message: `${roll.total} — point made, pass line wins.` }
  }
  if (roll.total === 7) {
    return { roll, state: newCrapsState(), outcome: 'lose', message: 'Seven out. Pass line loses.' }
  }
  return { roll, state, outcome: 'continue', message: `${roll.total} — no decision. Roll again.` }
}

/** Plays one complete pass-line decision through to win or lose. */
export function playPassLine(rng: Rng): 'win' | 'lose' {
  let state = newCrapsState()
  for (let guard = 0; guard < 1000; guard++) {
    const step = resolveRoll(state, rollDice(rng))
    state = step.state
    if (step.outcome !== 'continue') return step.outcome
  }
  return 'lose'
}

/** Which side of the line the shooter's bet is on. */
export type CrapsSide = 'pass' | 'dontPass'

export type CrapsDecision = CrapsOutcome | 'push'

export interface SideStep {
  roll: DiceRoll
  state: CrapsState
  /** From the point of view of the bet's own side. */
  outcome: CrapsDecision
  message: string
}

/**
 * One roll for a bet on either side. The don't pass bar a twelve on the
 * come-out (a push, which is where its small edge comes from) and wins on every
 * decision that beats the pass line.
 */
export function resolveSide(side: CrapsSide, state: CrapsState, roll: DiceRoll): SideStep {
  const step = resolveRoll(state, roll)
  if (side === 'pass') return step
  if (step.outcome === 'continue') return step
  if (state.phase === 'come-out' && roll.total === 12) {
    return { roll, state: newCrapsState(), outcome: 'push', message: '12 — bar twelve. Don’t pass pushes.' }
  }
  const won = step.outcome === 'lose'
  return {
    roll,
    state: newCrapsState(),
    outcome: won ? 'win' : 'lose',
    message: won
      ? state.phase === 'come-out'
        ? `${roll.total} — craps. Don’t pass wins.`
        : 'Seven out. Don’t pass wins.'
      : state.phase === 'come-out'
        ? `${roll.total} — natural. Don’t pass loses.`
        : `${roll.total} — point made. Don’t pass loses.`,
  }
}

/** Plays one complete decision for either side, to a win, loss or push. */
export function playLine(side: CrapsSide, rng: Rng): CrapsDecision {
  let state = newCrapsState()
  for (let guard = 0; guard < 1000; guard++) {
    const step = resolveSide(side, state, rollDice(rng))
    state = step.state
    if (step.outcome !== 'continue') return step.outcome
  }
  return 'lose'
}

/**
 * The free-odds bet taken behind the line once there is a point: paid at the
 * true odds, so it carries no house edge of its own. Pass odds win 2:1 on a 4 or
 * 10, 3:2 on a 5 or 9, 6:5 on a 6 or 8; the don't side lays the same odds.
 */
export function oddsRatio(point: number): [number, number] {
  if (point === 4 || point === 10) return [2, 1]
  if (point === 5 || point === 9) return [3, 2]
  return [6, 5]
}

/** Winnings, not counting the stake, of an odds bet that wins. */
export function oddsWinnings(side: CrapsSide, point: number, stake: number): number {
  const [num, den] = oddsRatio(point)
  return side === 'pass' ? Math.floor((stake * num) / den) : Math.floor((stake * den) / num)
}

/** The biggest odds bet the table allows behind a line bet of this size: one times it. */
export const MAX_ODDS_TIMES = 1
