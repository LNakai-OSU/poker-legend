import { SUITS, type Card, type Rank } from './types'
import type { Rng } from './rng'
import { defaultRng } from './rng'

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ rank: rank as Rank, suit })
    }
  }
  return deck
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffleDeck(deck: Card[], rng: Rng = defaultRng): Card[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
