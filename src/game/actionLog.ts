import type { Action } from '../engine/types'

/**
 * One line of narration for something a player just did, the way a GBA battle
 * reports a move: "Mack raises to 20." The betting menu shows the last few of
 * these while other people act, so the box says what just happened instead of
 * sitting empty — and a call or a fold that went by too fast is still there to
 * read.
 */
export function describeAction(
  name: string,
  action: Action,
  price: { toCall: number; allInTo: number },
): string {
  const you = name === 'You'
  switch (action.type) {
    case 'fold':
      return `${name} ${you ? 'fold' : 'folds'}.`
    case 'check':
      return `${name} ${you ? 'check' : 'checks'}.`
    case 'call': {
      const amount = Math.min(price.toCall, price.allInTo)
      return `${name} ${you ? 'call' : 'calls'} ${amount.toLocaleString()}.`
    }
    case 'raise': {
      if (action.to >= price.allInTo) return `${name} ${you ? 'are' : 'is'} all in for ${action.to.toLocaleString()}!`
      if (price.toCall > 0) return `${name} ${you ? 'raise' : 'raises'} to ${action.to.toLocaleString()}.`
      return `${name} ${you ? 'bet' : 'bets'} ${action.to.toLocaleString()}.`
    }
  }
}

/** How many lines of narration the menu keeps. */
export const LOG_LINES = 3
