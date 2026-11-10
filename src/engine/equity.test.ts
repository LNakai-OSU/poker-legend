import { describe, expect, it } from 'vitest'
import { knownEquities } from './equity'
import { mulberry32 } from './rng'
import { TexasHoldEmTable } from './table'
import type { Card, PlayerConfig } from './types'

const c = (rank: number, suit: Card['suit']): Card => ({ rank, suit }) as Card

describe('known equities', () => {
  it('is certain on the river', () => {
    const board = [c(2, 'clubs'), c(7, 'diamonds'), c(9, 'hearts'), c(11, 'spades'), c(4, 'clubs')]
    expect(knownEquities([[c(14, 'spades'), c(14, 'hearts')], [c(13, 'spades'), c(13, 'hearts')]], board, mulberry32(1))).toEqual([1, 0])
  })

  it('counts every turn card exactly: a flush draw against a pair with one card to come', () => {
    const board = [c(2, 'hearts'), c(7, 'hearts'), c(9, 'clubs'), c(12, 'diamonds')]
    // Pair of queens, against the nut flush draw: nine hearts, and the three aces left make a better pair.
    const [pair, draw] = knownEquities([[c(12, 'clubs'), c(3, 'spades')], [c(14, 'hearts'), c(10, 'hearts')]], board, mulberry32(1))
    expect(draw).toBeCloseTo(12 / 44, 10)
    expect(pair + draw).toBeCloseTo(1, 10)
  })

  it('puts aces about four to one over kings preflop, and always sums to one', () => {
    const [aces, kings] = knownEquities([[c(14, 'spades'), c(14, 'hearts')], [c(13, 'spades'), c(13, 'hearts')]], [], mulberry32(3), 4000)
    expect(aces).toBeGreaterThan(0.77)
    expect(aces).toBeLessThan(0.86)
    expect(aces + kings).toBeCloseTo(1, 10)
  })

  it('splits a chopped pot', () => {
    const board = [c(14, 'clubs'), c(13, 'diamonds'), c(12, 'hearts'), c(11, 'spades'), c(10, 'clubs')]
    expect(knownEquities([[c(2, 'clubs'), c(3, 'clubs')], [c(2, 'hearts'), c(3, 'hearts')]], board, mulberry32(1))).toEqual([0.5, 0.5])
  })
})

describe('a staged runout', () => {
  const players: PlayerConfig[] = [
    { id: 'a', name: 'A', isHuman: false, skillTier: 'novice', startingStack: 100 },
    { id: 'b', name: 'B', isHuman: false, skillTier: 'novice', startingStack: 100 },
  ]

  function shove(staged: boolean) {
    const table = new TexasHoldEmTable(players, { smallBlind: 1, bigBlind: 2, rng: mulberry32(11), stagedRunout: staged })
    table.startNewHand()
    for (let i = 0; i < 4 && table.getState().handInProgress && table.getState().actingPlayerId; i++) {
      const id = table.getState().actingPlayerId!
      table.submitAction(id, { type: 'raise', to: table.getState().players.find((p) => p.id === id)!.streetContribution + table.getState().players.find((p) => p.id === id)!.stack })
    }
    return table
  }

  it('waits, and deals a street at a time, to the same board as an unstaged hand', () => {
    const staged = shove(true)
    expect(staged.getState()).toMatchObject({ handInProgress: true, runout: true, street: 'preflop', actingPlayerId: null })
    expect(staged.getState().board).toHaveLength(0)
    staged.dealRunoutStreet()
    expect(staged.getState().board).toHaveLength(3)
    staged.dealRunoutStreet()
    staged.dealRunoutStreet()
    expect(staged.getState()).toMatchObject({ handInProgress: false, runout: false })
    const plain = shove(false)
    expect(plain.getState().handInProgress).toBe(false)
    // Same shuffle, same cards: staging changes when they are shown, never which.
    expect(staged.getLastHandResult()!.board).toEqual(plain.getLastHandResult()!.board)
    expect(staged.getLastHandResult()!.pots.map((p) => p.winnerIds)).toEqual(plain.getLastHandResult()!.pots.map((p) => p.winnerIds))
  })

  it('refuses a deal when nothing is waiting', () => {
    const table = new TexasHoldEmTable(players, { smallBlind: 1, bigBlind: 2, rng: mulberry32(11), stagedRunout: true })
    expect(() => table.dealRunoutStreet()).toThrow(/waiting/)
  })
})
