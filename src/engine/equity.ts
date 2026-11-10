import { createDeck } from './deck'
import { bestHand, compareHandStrength } from './handRank'
import type { Rng } from './rng'
import type { Card } from './types'

const key = (c: Card) => `${c.rank}${c.suit}`

/** Past this many boards to count, sample instead of counting every one. */
const EXACT_LIMIT = 6000

/**
 * Each hand's chance of winning, when every hole card is known: the position
 * on a broadcast when everyone is all in and the cards are face up.
 *
 * Counts every possible board when there are few enough (a flop or later), and
 * samples when there are not (a preflop all-in has over a million). A split pot
 * counts as an equal share. The shares sum to 1.
 */
export function knownEquities(holes: Card[][], board: Card[], rng: Rng, samples = 2500): number[] {
  const wins = holes.map(() => 0)
  if (holes.length === 0) return wins
  const used = new Set([...holes.flat(), ...board].map(key))
  const rest = createDeck().filter((c) => !used.has(key(c)))
  const need = 5 - board.length

  const settle = (full: Card[]) => {
    const strengths = holes.map((hole) => bestHand([...hole, ...full]))
    let best = strengths[0]
    for (const s of strengths) if (compareHandStrength(s, best) > 0) best = s
    const tied = strengths.map((s, i) => (compareHandStrength(s, best) === 0 ? i : -1)).filter((i) => i >= 0)
    for (const i of tied) wins[i] += 1 / tied.length
  }

  if (need <= 0) {
    settle(board)
    return wins
  }

  // How many ways to choose `need` of the remaining cards.
  let combos = 1
  for (let i = 0; i < need; i++) combos = (combos * (rest.length - i)) / (i + 1)

  let runs = 0
  if (combos <= EXACT_LIMIT) {
    const pick = (start: number, chosen: Card[]) => {
      if (chosen.length === need) {
        settle([...board, ...chosen])
        runs++
        return
      }
      for (let i = start; i < rest.length; i++) pick(i + 1, [...chosen, rest[i]])
    }
    pick(0, [])
  } else {
    const pool = [...rest]
    for (let n = 0; n < samples; n++) {
      // A partial shuffle: only the cards that are needed.
      for (let i = 0; i < need; i++) {
        const j = i + Math.floor(rng() * (pool.length - i))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      settle([...board, ...pool.slice(0, need)])
      runs++
    }
  }
  return wins.map((w) => w / runs)
}
