import { describe, expect, it } from 'vitest'
import type { HandResult } from '../engine/table'
import { CHARACTERS } from '../world/characters'
import { cleanBook, cueVerdict, emptyNotes, mergeBook, SessionTracker } from './book'
import { bookEntries } from './bookView'

const card = (rank: number, suit: 'c' | 'd' | 'h' | 's') => ({ rank, suit }) as never

function result(over: Partial<HandResult>): HandResult {
  return { handNumber: 1, board: [], pots: [], revealed: [], bustedPlayerIds: [], ...over }
}
const pot = (amount: number, winnerIds: string[], eligiblePlayerIds: string[]) => ({
  amount,
  eligiblePlayerIds,
  uncalled: false,
  winnerIds,
  amountPerWinner: amount / winnerIds.length,
  remainder: 0,
})

describe('the session tracker', () => {
  it('counts a cue only when the hand reaches a showdown, and who won it', () => {
    const t = new SessionTracker(2)
    t.startHand(['mack', 'deb'])
    t.tell('mack', 'chip-tap')
    t.tell('deb', 'glance')
    t.endHand(
      result({
        pots: [pot(40, ['mack'], ['you', 'mack', 'deb'])],
        revealed: [{ playerId: 'mack', holeCards: [card(14, 's'), card(14, 'h')], categoryName: 'pair' }],
      }),
    )
    expect(t.notesOn('mack')?.cues['chip-tap']).toEqual({ won: 1, lost: 0 })
    // Deb folded: nobody saw her cards, so the cue has no meaning yet.
    expect(t.notesOn('deb')?.cues.glance).toBeUndefined()
  })

  it('records pots taken both ways and remembers a big one', () => {
    const t = new SessionTracker(2)
    t.startHand(['mack'])
    t.endHand(result({ pots: [pot(100, ['you'], ['you', 'mack'])] }))
    expect(t.notesOn('mack')).toMatchObject({ youTook: 1, lastBigPot: 'you' })
    t.startHand(['mack'])
    t.endHand(result({ handNumber: 2, pots: [pot(10, ['mack'], ['you', 'mack'])] }))
    // A small pot does not rewrite who took the big one.
    expect(t.notesOn('mack')).toMatchObject({ youTook: 1, tookFromYou: 1, lastBigPot: 'you' })
  })

  it('counts a fold to you only if you had bet first and went on to win', () => {
    const t = new SessionTracker(2)
    t.startHand(['mack', 'deb'])
    t.action('mack', 'fold')
    t.action('you', 'raise')
    t.action('deb', 'fold')
    t.endHand(result({ pots: [pot(30, ['you'], ['you'])] }))
    expect(t.notesOn('mack')?.foldedToYou).toBe(0)
    expect(t.notesOn('deb')?.foldedToYou).toBe(1)
  })

  it('counts their decisions, and a sitting once', () => {
    const t = new SessionTracker(2)
    t.startHand(['mack'])
    t.action('mack', 'raise')
    t.action('mack', 'fold')
    t.startHand(['mack'])
    expect(t.notesOn('mack')).toMatchObject({ sittings: 1, hands: 2, decisions: 2, aggressive: 1, folds: 1 })
  })
})

describe('the book', () => {
  it('adds a sitting to what was already there', () => {
    const before = { mack: { ...emptyNotes(), hands: 3, cues: { glance: { won: 1, lost: 1 } } } }
    const after = mergeBook(before, { mack: { ...emptyNotes(), hands: 2, cues: { glance: { won: 1, lost: 0 }, stillness: { won: 0, lost: 1 } } } })
    expect(after.mack.hands).toBe(5)
    expect(after.mack.cues).toEqual({ glance: { won: 2, lost: 1 }, stillness: { won: 0, lost: 1 } })
    expect(before.mack.hands).toBe(3)
  })

  it('survives a save with nothing or nonsense in it', () => {
    expect(cleanBook(undefined)).toEqual({})
    expect(cleanBook([1, 2])).toEqual({})
    expect(cleanBook({ mack: { hands: 'lots' } }).mack.hands).toBe(0)
  })

  it('will not commit to a reading on a couple of showdowns', () => {
    expect(cueVerdict({ won: 4, lost: 0 })).toBe('unknown')
    expect(cueVerdict({ won: 4, lost: 1 })).toBe('strong')
    expect(cueVerdict({ won: 0, lost: 5 })).toBe('weak')
    expect(cueVerdict({ won: 3, lost: 2 })).toBe('unclear')
  })

  it('writes a page for people you have met, in cue words the table uses', () => {
    const id = Object.keys(CHARACTERS).find((c) => CHARACTERS[c].seat)!
    const entries = bookEntries({ [id]: { ...emptyNotes(), hands: 4, cues: { 'chip-tap': { won: 5, lost: 0 } } }, stranger: emptyNotes() })
    expect(entries).toHaveLength(1)
    expect(entries[0].lines.some((l) => l.text.includes('strong'))).toBe(true)
  })
})

describe('personal tells', () => {
  const seated = Object.entries(CHARACTERS).filter(([, c]) => c.seat)
  it('gives everyone but a whale a pair of cues of their own', () => {
    for (const [id, c] of seated) {
      if (c.seat!.archetype === 'whale') expect(c.seat!.habit, `${id} is a whale and tells honestly`).toBeUndefined()
      else {
        expect(c.seat!.habit, `${id} has no habit`).toBeDefined()
        expect(c.seat!.habit!.strong, `${id}'s good and bad hands look the same`).not.toBe(c.seat!.habit!.weak)
      }
    }
  })
})
