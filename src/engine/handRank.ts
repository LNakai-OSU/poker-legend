import { HandCategory, type Card, type HandStrength } from './types'

function ranksDesc(cards: Card[]): number[] {
  return [...cards].map((c) => c.rank).sort((a, b) => b - a)
}

function countByRank(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
  return counts
}

/** Returns the high card of the straight (5 for a wheel A-2-3-4-5), or null if not a straight. */
function straightHigh(cards: Card[]): number | null {
  const uniqueRanks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => b - a)
  if (uniqueRanks.length < 5) return null

  // Wheel: A-2-3-4-5 (ace plays low)
  const wheel = [14, 5, 4, 3, 2]
  if (wheel.every((r) => uniqueRanks.includes(r))) {
    // Only count the wheel if there isn't a *higher* straight also present.
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) return uniqueRanks[i]
    }
    return 5
  }

  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) return uniqueRanks[i]
  }
  return null
}

/** Evaluates exactly 5 cards. */
export function evaluate5(cards: Card[]): HandStrength {
  if (cards.length !== 5) throw new Error('evaluate5 requires exactly 5 cards')

  const isFlush = new Set(cards.map((c) => c.suit)).size === 1
  const high = straightHigh(cards)
  const counts = countByRank(cards)
  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1] // by count desc
    return b[0] - a[0] // then by rank desc
  })

  if (isFlush && high !== null) {
    return { category: HandCategory.StraightFlush, tiebreak: [high], cards }
  }
  if (groups[0][1] === 4) {
    const kicker = groups[1][0]
    return { category: HandCategory.FourOfAKind, tiebreak: [groups[0][0], kicker], cards }
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { category: HandCategory.FullHouse, tiebreak: [groups[0][0], groups[1][0]], cards }
  }
  if (isFlush) {
    return { category: HandCategory.Flush, tiebreak: ranksDesc(cards), cards }
  }
  if (high !== null) {
    return { category: HandCategory.Straight, tiebreak: [high], cards }
  }
  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map((g) => g[0]).sort((a, b) => b - a)
    return { category: HandCategory.ThreeOfAKind, tiebreak: [groups[0][0], ...kickers], cards }
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const [pairHigh, pairLow] = [groups[0][0], groups[1][0]].sort((a, b) => b - a)
    const kicker = groups[2][0]
    return { category: HandCategory.TwoPair, tiebreak: [pairHigh, pairLow, kicker], cards }
  }
  if (groups[0][1] === 2) {
    const kickers = groups.slice(1).map((g) => g[0]).sort((a, b) => b - a)
    return { category: HandCategory.Pair, tiebreak: [groups[0][0], ...kickers], cards }
  }
  return { category: HandCategory.HighCard, tiebreak: ranksDesc(cards), cards }
}

export function compareHandStrength(a: HandStrength, b: HandStrength): number {
  if (a.category !== b.category) return a.category - b.category
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Best 5-card hand out of any number of cards >= 5 (used for 7-card Hold'em hands). */
export function bestHand(cards: Card[]): HandStrength {
  if (cards.length < 5) throw new Error('bestHand requires at least 5 cards')
  if (cards.length === 5) return evaluate5(cards)

  let best: HandStrength | null = null
  const n = cards.length
  const combo: Card[] = new Array(5)

  const recurse = (start: number, depth: number) => {
    if (depth === 5) {
      const strength = evaluate5(combo)
      if (!best || compareHandStrength(strength, best) > 0) best = strength
      return
    }
    for (let i = start; i <= n - (5 - depth); i++) {
      combo[depth] = cards[i]
      recurse(i + 1, depth + 1)
    }
  }
  recurse(0, 0)

  return best!
}

export const HAND_CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'High Card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two Pair',
  [HandCategory.ThreeOfAKind]: 'Three of a Kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.FourOfAKind]: 'Four of a Kind',
  [HandCategory.StraightFlush]: 'Straight Flush',
}
