import { describe, expect, it } from 'vitest'
import { emptyNotes } from '../game/book'
import { CHARACTERS } from './characters'
import { MEMORY_LINES, MEMORY_OF_YOU, memoryLine, memoryOf } from './memory'

const notes = (over: Partial<ReturnType<typeof emptyNotes>>) => ({ ...emptyNotes(), ...over })

describe('what they remember', () => {
  it('has nothing to say about a stranger', () => {
    expect(memoryOf(undefined, undefined)).toBeNull()
    expect(memoryOf(notes({ hands: 5 }), notes({}))).toBeNull()
  })

  it('remembers who took the last big pot', () => {
    expect(memoryOf(notes({ hands: 9, lastBigPot: 'you' }), undefined)).toBe('youTookBig')
    expect(memoryOf(notes({ hands: 9, lastBigPot: 'them' }), undefined)).toBe('theyTookBig')
  })

  it('knows you after a good while at the same tables', () => {
    expect(memoryOf(notes({ hands: 20 }), undefined)).toBe('knowYou')
  })

  it('notices being run off pots this sitting, ahead of any old grudge', () => {
    expect(memoryOf(notes({ lastBigPot: 'you' }), notes({ foldedToYou: 2 }))).toBe('youTookBig')
    expect(memoryOf(notes({ lastBigPot: 'you' }), notes({ foldedToYou: 3 }))).toBe('foldsToYou')
  })
})

describe('what they say', () => {
  it('has a line for every kind of player and every memory', () => {
    for (const [archetype, kinds] of Object.entries(MEMORY_LINES)) {
      for (const [kind, lines] of Object.entries(kinds)) expect(lines.length, `${archetype}/${kind}`).toBeGreaterThan(0)
    }
  })

  it('is in their own voice where they have one, and only for people who play', () => {
    for (const id of Object.keys(MEMORY_OF_YOU)) expect(CHARACTERS[id]?.seat, `${id} cannot say it: they never sit down`).toBeDefined()
    expect(memoryLine('mack', 'nit', 'youTookBig', () => 0)).toBe(MEMORY_OF_YOU.mack.youTookBig![0])
  })

  it('falls back to how their kind of player talks', () => {
    expect(memoryLine('someone-new', 'maniac', 'theyTookBig', () => 0)).toBe(MEMORY_LINES.maniac.theyTookBig[0])
  })

  it('never says a name in the line: the table puts it in front', () => {
    const all = [...Object.values(MEMORY_LINES).flatMap((k) => Object.values(k).flat()), ...Object.values(MEMORY_OF_YOU).flatMap((k) => Object.values(k).flat())]
    for (const line of all) expect(/^[A-Z][a-zé]+: /.test(line), line).toBe(false)
  })
})
