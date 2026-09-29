import { describe, expect, it } from 'vitest'
import { bestHand, compareHandStrength, evaluate5 } from './handRank'
import { createDeck, shuffleDeck } from './deck'
import { HandCategory, type Card } from './types'
import { mulberry32 } from './rng'

function c(spec: string): Card {
  // spec like "As", "Td", "9h", "2c"
  const rankChar = spec.slice(0, -1)
  const suitChar = spec.slice(-1)
  const rank =
    rankChar === 'A' ? 14 : rankChar === 'K' ? 13 : rankChar === 'Q' ? 12 : rankChar === 'J' ? 11 :
    rankChar === 'T' ? 10 : (Number(rankChar) as Card['rank'])
  const suit = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[suitChar] as Card['suit']
  return { rank, suit }
}

function hand(spec: string) {
  return spec.split(' ').map(c)
}

describe('evaluate5', () => {
  it('recognizes a straight flush', () => {
    expect(evaluate5(hand('5h 6h 7h 8h 9h')).category).toBe(HandCategory.StraightFlush)
  })

  it('recognizes a wheel straight flush (A-2-3-4-5)', () => {
    const r = evaluate5(hand('Ah 2h 3h 4h 5h'))
    expect(r.category).toBe(HandCategory.StraightFlush)
    expect(r.tiebreak[0]).toBe(5)
  })

  it('recognizes four of a kind over a full house', () => {
    const quads = evaluate5(hand('9h 9s 9d 9c 2h'))
    const fullHouse = evaluate5(hand('9h 9s 9d 2c 2h'))
    expect(quads.category).toBe(HandCategory.FourOfAKind)
    expect(fullHouse.category).toBe(HandCategory.FullHouse)
    expect(compareHandStrength(quads, fullHouse)).toBeGreaterThan(0)
  })

  it('recognizes a flush over a straight', () => {
    const flush = evaluate5(hand('2h 5h 9h Jh Kh'))
    const straight = evaluate5(hand('5c 6d 7h 8s 9c'))
    expect(flush.category).toBe(HandCategory.Flush)
    expect(straight.category).toBe(HandCategory.Straight)
    expect(compareHandStrength(flush, straight)).toBeGreaterThan(0)
  })

  it('breaks ties on two pair by the higher pair first, then kicker', () => {
    const a = evaluate5(hand('Kh Ks 4d 4c 2h'))
    const b = evaluate5(hand('Kd Kc 3d 3c Ah'))
    // a: pairs K,4 kicker 2 | b: pairs K,3 kicker A -> a's second pair (4) beats b's (3)
    expect(compareHandStrength(a, b)).toBeGreaterThan(0)
  })

  it('treats identical hands as a tie', () => {
    const a = evaluate5(hand('Ah Kh Qh Jh 9h'))
    const b = evaluate5(hand('As Ks Qs Js 9s'))
    expect(compareHandStrength(a, b)).toBe(0)
  })

  it('does not misfire a straight on a non-consecutive run', () => {
    const r = evaluate5(hand('2h 4d 6c 8s Th'))
    expect(r.category).toBe(HandCategory.HighCard)
  })
})

describe('bestHand (7 cards)', () => {
  it('finds the best 5-card hand among 7', () => {
    // board gives a flush possibility, hole cards complete it
    const seven = hand('Ah 2h 3h 4h 5c 6c 7h')
    const result = bestHand(seven)
    expect(result.category).toBe(HandCategory.Flush)
  })

  it('prefers straight flush over plain flush when both are available', () => {
    const seven = hand('5h 6h 7h 8h 9h 2c 3d')
    const result = bestHand(seven)
    expect(result.category).toBe(HandCategory.StraightFlush)
  })
})

describe('deck integrity', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck()
    expect(deck.length).toBe(52)
    const ids = new Set(deck.map((card) => `${card.rank}${card.suit}`))
    expect(ids.size).toBe(52)
  })

  it('shuffling preserves the exact card set', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck, mulberry32(42))
    expect(shuffled.length).toBe(deck.length)
    const originalIds = new Set(deck.map((c2) => `${c2.rank}${c2.suit}`))
    const shuffledIds = new Set(shuffled.map((c2) => `${c2.rank}${c2.suit}`))
    expect(shuffledIds).toEqual(originalIds)
  })

  it('is deterministic for a given seed', () => {
    const a = shuffleDeck(createDeck(), mulberry32(7))
    const b = shuffleDeck(createDeck(), mulberry32(7))
    expect(a).toEqual(b)
  })
})
