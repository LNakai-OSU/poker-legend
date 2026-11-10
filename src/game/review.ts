import type { Street } from '../engine/types'

/**
 * Hal looks over your shoulder.
 *
 * Every time you faced a bet and called or folded, the table scene works out
 * your chance of winning and writes the choice down. This file judges them. The
 * numbers are the standard ones — pot odds against equity — so anything it
 * calls a mistake is one on paper, and it is careful which way it leans:
 *
 * - Equity is measured against *random* hands. A bettor holds better than
 *   random, so a call that is wrong even by that generous measure is wrong.
 *   A fold that is "wrong" by it might be right against a real range, so only
 *   a fold of a huge favourite is called one.
 */
export interface Decision {
  hand: number
  street: Street
  action: 'call' | 'fold'
  /** What it cost to stay in, and what was in the middle before you did. */
  toCall: number
  pot: number
  /** Your chance of winning, against random hands, 0 to 1. */
  equity: number
  bigBlind: number
}

export type Finding =
  | { kind: 'bad-call'; decision: Decision; needed: number; cost: number }
  | { kind: 'bad-fold'; decision: Decision; needed: number; cost: number }
  | { kind: 'good-fold'; decision: Decision; needed: number; saved: number }
  | { kind: 'good-call'; decision: Decision; needed: number }

/** The share of the final pot you must win to break even on a call. */
export const potOddsNeeded = (toCall: number, pot: number): number => (pot + toCall <= 0 ? 0 : toCall / (pot + toCall))

/** Wrong by less than this is noise in a Monte Carlo estimate, not a mistake. */
const CALL_MARGIN = 0.06
const FOLD_MARGIN = 0.25
const GOOD_FOLD_MARGIN = 0.1

export function judge(d: Decision): Finding | null {
  // Folding or calling a bet worth less than a big blind is not a decision worth a page.
  if (d.toCall < d.bigBlind) return null
  const needed = potOddsNeeded(d.toCall, d.pot)
  const stake = d.pot + d.toCall
  if (d.action === 'call') {
    if (d.equity < needed - CALL_MARGIN) return { kind: 'bad-call', decision: d, needed, cost: Math.round((needed - d.equity) * stake) }
    if (d.equity > needed + 0.1) return { kind: 'good-call', decision: d, needed }
    return null
  }
  if (d.equity > needed + FOLD_MARGIN) return { kind: 'bad-fold', decision: d, needed, cost: Math.round((d.equity - needed) * stake) }
  if (d.equity < needed - GOOD_FOLD_MARGIN) return { kind: 'good-fold', decision: d, needed, saved: Math.round((needed - d.equity) * stake) }
  return null
}

export interface Recap {
  net: number
  hands: number
  potsWon: number
  bestHand: string | null
  worst: Finding | null
  badCalls: number
  badFolds: number
  goodFolds: number
  goodCalls: number
}

const STREET_WORD: Partial<Record<Street, string>> = { preflop: 'before the flop', flop: 'on the flop', turn: 'on the turn', river: 'on the river' }

const pct = (n: number) => `${Math.round(n * 100)}%`
const money = (n: number) => `$${n.toLocaleString()}`

export function summarise(decisions: Decision[], session: { net: number; hands: number; potsWon: number; bestHand: string | null }): Recap {
  const findings = decisions.map(judge).filter((f): f is Finding => f !== null)
  const costly = findings.filter((f): f is Extract<Finding, { cost: number }> => f.kind === 'bad-call' || f.kind === 'bad-fold')
  const worst = costly.reduce<Finding | null>((best, f) => (best === null || (best as { cost: number }).cost < f.cost ? f : best), null)
  return {
    ...session,
    worst,
    badCalls: findings.filter((f) => f.kind === 'bad-call').length,
    badFolds: findings.filter((f) => f.kind === 'bad-fold').length,
    goodFolds: findings.filter((f) => f.kind === 'good-fold').length,
    goodCalls: findings.filter((f) => f.kind === 'good-call').length,
  }
}

/** Hal's words over the session, a few short lines. */
export function halsNotes(recap: Recap): string[] {
  const lines: string[] = []
  const w = recap.worst
  if (w && (w.kind === 'bad-call' || w.kind === 'bad-fold')) {
    const d = w.decision
    const when = STREET_WORD[d.street] ?? 'in a hand'
    if (w.kind === 'bad-call') {
      lines.push(`Hand ${d.hand}, ${when}: you called ${money(d.toCall)} into ${money(d.pot)}. You needed ${pct(w.needed)} to break even and had about ${pct(d.equity)}, and that is against random cards. About ${money(w.cost)} down the drain.`)
    } else {
      lines.push(`Hand ${d.hand}, ${when}: you folded to ${money(d.toCall)} into ${money(d.pot)} holding about ${pct(d.equity)} when ${pct(w.needed)} was enough. A hand that strong is worth the call. That was roughly ${money(w.cost)} on the table.`)
    }
  }
  if (recap.badCalls > 1) lines.push(`${recap.badCalls} calls were against the price. Pot odds are cheap to check: the call divided by the pot plus the call. If your hand does not win that often, let it go.`)
  if (recap.goodFolds > 0) lines.push(`${recap.goodFolds === 1 ? 'One fold' : `${recap.goodFolds} folds`} I liked, a loser let go at the right price. Nobody pays you for those, which is why people do not make them.`)
  if (recap.goodCalls > 0 && !w) lines.push(`${recap.goodCalls === 1 ? 'One call' : `${recap.goodCalls} calls`} with the odds on your side. That is the whole job.`)
  if (!w && recap.goodFolds === 0 && recap.goodCalls === 0) lines.push(recap.hands < 4 ? 'Too short a sitting for me to say much. Stay a little longer next time.' : 'Nothing to pick at: you were never in a spot where the price decided it. Make them put you to the test.')
  return lines
}
