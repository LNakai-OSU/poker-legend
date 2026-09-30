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
