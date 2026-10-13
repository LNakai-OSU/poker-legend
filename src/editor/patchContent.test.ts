import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import {
  PatchError,
  readCharacters,
  readEvents,
  saveCharacter,
  saveEvent,
} from './patchContent'
import { sameValue } from './literal'
import { CHARACTERS, type CharacterDef } from '../world/characters'
import { EVENTS, type GameEvent } from '../world/events'

/**
 * Tested against the real `characters.ts` and `events.ts`, not fixtures.
 *
 * These write the files the game's people and story live in. A fixture proves
 * the shapes I thought to write down; the real files prove the shapes that are
 * in there — schedule entries laid out by hand, comments inside entries, a
 * sentence wrapped across three lines with `+`, a curly apostrophe.
 */
const CHARACTER_SOURCE = readFileSync(new URL('../world/characters.ts', import.meta.url), 'utf8')
const EVENT_SOURCE = readFileSync(new URL('../world/events.ts', import.meta.url), 'utf8')

/** The values as the editor would send them: plain JSON. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Syntax errors TypeScript would report in this text. */
function syntaxErrors(source: string): string[] {
  const out = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext } })
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

/** The lines that differ between two versions of a file, as [removed, added]. */
function changedLines(before: string, after: string): [string[], string[]] {
  const a = before.split('\n')
  const b = after.split('\n')
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  return [a.slice(start, endA), b.slice(start, endB)]
}

const character = (id: string) => plain(CHARACTERS[id]) as CharacterDef
const event = (id: string) => plain(EVENTS.find((e) => e.id === id)!) as GameEvent

describe('reading the content files', () => {
  it('reads every character exactly as the game does', () => {
    // If the parser misread one value, every save of that character would
    // "change" it back to the misreading.
    const read = readCharacters(CHARACTER_SOURCE)
    expect(Object.keys(read)).toEqual(Object.keys(CHARACTERS))
    for (const id of Object.keys(CHARACTERS)) {
      expect(sameValue(read[id], plain(CHARACTERS[id])), id).toBe(true)
    }
  })

  it('reads every event exactly as the game does', () => {
    const read = readEvents(EVENT_SOURCE)
    expect(read).toHaveLength(EVENTS.length)
    EVENTS.forEach((e, i) => expect(sameValue(read[i], plain(e)), e.id).toBe(true))
  })
})

describe('saving without changing anything', () => {
  it('leaves characters.ts byte-identical for every character', () => {
    for (const id of Object.keys(CHARACTERS)) {
      const { source, notes } = saveCharacter(CHARACTER_SOURCE, { id, before: character(id), after: character(id) })
      expect(source === CHARACTER_SOURCE, `saving ${id} unchanged rewrote the file`).toBe(true)
      expect(notes).toEqual(['nothing changed'])
    }
  })

  it('leaves events.ts byte-identical for every event', () => {
    for (const e of EVENTS) {
      const { source, notes } = saveEvent(EVENT_SOURCE, { id: e.id, before: event(e.id), after: event(e.id) })
      expect(source === EVENT_SOURCE, `saving ${e.id} unchanged rewrote the file`).toBe(true)
      expect(notes).toEqual(['nothing changed'])
    }
  })

  it('puts every character back byte for byte after an edit is undone', () => {
    // A stronger round trip: change the name, the style and a line, save, then
    // save the original back over it. Only a patcher that touches nothing but
    // the changed text gets the file back exactly.
    for (const id of Object.keys(CHARACTERS)) {
      const original = character(id)
      const edited = character(id)
      edited.name += ' Jr'
      edited.style = `${edited.style} Mostly.`
      const category = Object.keys(edited.lines)[0] as keyof CharacterDef['lines']
      edited.lines[category] = [...edited.lines[category]!, "A new line, with an apostrophe's worth."]
      const once = saveCharacter(CHARACTER_SOURCE, { id, before: original, after: edited }).source
      expect(once).not.toBe(CHARACTER_SOURCE)
      const back = saveCharacter(once, { id, before: edited, after: original }).source
      expect(back === CHARACTER_SOURCE, `${id} did not come back byte for byte`).toBe(true)
    }
  })

  it('puts every event back byte for byte after an edit is undone', () => {
    for (const e of EVENTS) {
      const original = event(e.id)
      const edited = event(e.id)
      edited.repeatable = !edited.repeatable
      edited.actions = [...edited.actions, { kind: 'wait', ms: 250 }]
      const once = saveEvent(EVENT_SOURCE, { id: e.id, before: original, after: edited }).source
      const back = saveEvent(once, { id: e.id, before: edited, after: original }).source
      expect(back === EVENT_SOURCE, `${e.id} did not come back byte for byte`).toBe(true)
    }
  })
})

describe('editing a character', () => {
  it('changes one line of dialogue and nothing else', () => {
    const before = character('gus')
    const after = character('gus')
    after.lines.call = ['Gus: Call, call, call, call.']
    const { source, notes } = saveCharacter(CHARACTER_SOURCE, { id: 'gus', before, after })
    const [removed, added] = changedLines(CHARACTER_SOURCE, source)
    expect(removed).toEqual(["      call: ['Gus: Call, call, call.'],"])
    expect(added).toEqual(["      call: ['Gus: Call, call, call, call.'],"])
    expect(notes).toEqual(['changed gus.lines.call[0]'])
  })

  it('keeps the comments inside the entry it edits', () => {
    const before = character('marcus')
    const after = character('marcus')
    after.lines.greeting = ['Marcus: Right. No hard feelings.']
    after.overworld!.lines = ['Marcus: Around. Always around.']
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'marcus', before, after })
    expect(source).toContain('// He works, he eats, he goes home and deals. The Friday game is at his')
    expect(source).toContain("lines: ['Marcus: Around. Always around.'],")
    expect(syntaxErrors(source)).toEqual([])
  })

  it('keeps a persona comment when the persona is edited', () => {
    const before = character('vance')
    const after = character('vance')
    after.personas!.headsUp.lines!.fold = ['Vance: Fine. Yours.']
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'vance', before, after })
    expect(source).toContain('// The heads-up match against the same man.')
    expect(source).toContain("fold: ['Vance: Fine. Yours.'],")
  })

  it('moves a scheduled person without disturbing the hand layout around them', () => {
    const before = character('marcus')
    const after = character('marcus')
    after.overworld!.schedule[0].col = 10
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'marcus', before, after })
    const [removed, added] = changedLines(CHARACTER_SOURCE, source)
    expect(removed).toEqual(["        { period: 'morning', areaId: 'basin', col: 9, row: 11, lines: ["])
    expect(added).toEqual(["        { period: 'morning', areaId: 'basin', col: 10, row: 11, lines: ["])
  })

  it('drops the lines from a schedule entry, falling back to the usual ones', () => {
    const before = character('marcus')
    const after = character('marcus')
    delete after.overworld!.schedule[1].lines
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'marcus', before, after })
    expect(source).toContain("        { period: 'afternoon', areaId: 'marcus-house', col: 5, row: 6 },\n")
    expect(syntaxErrors(source)).toEqual([])
  })

  it('adds and removes schedule entries in the style of the list', () => {
    const before = character('deb')
    const after = character('deb')
    after.overworld!.schedule.push({ period: 'night', areaId: 'rb-street', col: 9, row: 8 })
    after.overworld!.schedule.splice(0, 1)
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'deb', before, after })
    expect(source).not.toContain('Boat does not open till noon')
    expect(source).toContain("        { period: 'night', areaId: 'rb-street', col: 9, row: 8 },\n")
    expect(source).toContain("Deb: Busy tonight. Good. Busy is good for me.")
    expect(syntaxErrors(source)).toEqual([])
    expect(sameValue(readCharacters(source).deb, after)).toBe(true)
  })

  it('puts a new kind of line where the editor ordered it', () => {
    const before = character('marcus')
    const after = character('marcus')
    after.lines = {
      greeting: after.lines.greeting,
      raise: after.lines.raise,
      bet: ['Marcus: I bet. I think.'],
      call: after.lines.call,
      fold: after.lines.fold,
      win: after.lines.win,
      lose: after.lines.lose,
    }
    const { source, notes } = saveCharacter(CHARACTER_SOURCE, { id: 'marcus', before, after })
    const [removed, added] = changedLines(CHARACTER_SOURCE, source)
    expect(removed).toEqual([])
    expect(added).toEqual(["      bet: ['Marcus: I bet. I think.'],"])
    expect(source.indexOf("bet: ['Marcus")).toBeGreaterThan(source.indexOf("raise: ['Marcus"))
    expect(source.indexOf("bet: ['Marcus")).toBeLessThan(source.indexOf("call: ['Marcus"))
    expect(notes).toEqual(['added marcus.lines.bet'])
  })

  it('takes a whole kind of line away', () => {
    const before = character('gus')
    const after = character('gus')
    delete after.lines.check
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'gus', before, after })
    const [removed, added] = changedLines(CHARACTER_SOURCE, source)
    expect(removed).toEqual(["      check: ['Gus: Check. Let us see a card.'],"])
    expect(added).toEqual([])
  })

  it('wraps a list that grows past the edge of the line', () => {
    const before = character('pearl')
    const after = character('pearl')
    after.lines.raise = [...after.lines.raise!, 'Pearl: And more again, because I am that sort of person today.']
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'pearl', before, after })
    expect(source).toContain(
      "      raise: [\n        'Pearl: Raise.',\n        'Pearl: And more.',\n        'Pearl: And more again, because I am that sort of person today.',\n      ],\n",
    )
    expect(syntaxErrors(source)).toEqual([])
  })

  it('adds an overworld presence to somebody who only ever sat at a table', () => {
    const before = character('tiny')
    const after = character('tiny')
    after.overworld = {
      lines: ['Tiny: Buy you a drink?'],
      schedule: [{ period: 'evening', areaId: 'rb-street', col: 4, row: 7 }],
    }
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'tiny', before, after })
    expect(syntaxErrors(source)).toEqual([])
    expect(sameValue(readCharacters(source).tiny, after)).toBe(true)
    const [, added] = changedLines(CHARACTER_SOURCE, source)
    for (const line of added) {
      expect(line.length, line).toBeLessThanOrEqual(110)
      expect(line, 'indents with spaces').not.toMatch(/\t/)
    }
  })

  it('quotes a line with an apostrophe the way the file does', () => {
    const before = character('omar')
    const after = character('omar')
    after.lines.fold = ["Omar: I'm done."]
    after.lines.win = ['Omar: He said "breakfast".']
    after.lines.lose = ['Omar: It\'s "fine".']
    const { source } = saveCharacter(CHARACTER_SOURCE, { id: 'omar', before, after })
    expect(source).toContain(`fold: ["Omar: I'm done."],`)
    expect(source).toContain(`win: ['Omar: He said "breakfast".'],`)
    expect(source).toContain(`lose: ['Omar: It\\'s "fine".'],`)
    expect(sameValue(readCharacters(source).omar, after)).toBe(true)
  })

  it('creates a new character at the end of the list', () => {
    const fresh: CharacterDef = {
      name: 'Wren',
      style: 'Counts outs on her fingers.',
      look: { skin: '#d8a878', hair: '#2a1d14', hairStyle: 'tied', shirt: '#4a7a8b', accessory: 'glasses' },
      seat: { skillTier: 'amateur', archetype: 'nit' },
      lines: { greeting: ['Wren: Hello.'] },
    }
    const { source, notes } = saveCharacter(CHARACTER_SOURCE, { id: 'wren', after: fresh })
    expect(syntaxErrors(source)).toEqual([])
    const read = readCharacters(source)
    expect(Object.keys(read).at(-1)).toBe('wren')
    expect(sameValue(read.wren, fresh)).toBe(true)
    expect(notes).toEqual(['added character wren'])
    // Everything before it is untouched.
    const [removed] = changedLines(CHARACTER_SOURCE, source)
    expect(removed).toEqual([])
    expect(source).toContain(
      "  wren: {\n    name: 'Wren',\n    style: 'Counts outs on her fingers.',\n" +
        "    look: { skin: '#d8a878', hair: '#2a1d14', hairStyle: 'tied', shirt: '#4a7a8b', accessory: 'glasses' },\n",
    )
  })
})

describe('editing an event', () => {
  it('rewords one line of dialogue', () => {
    const before = event('dana-takes-your-measure')
    const after = event('dana-takes-your-measure')
    ;(after.actions[0] as { lines: string[] }).lines[0] = 'Dana: You beat Marcus.'
    const { source } = saveEvent(EVENT_SOURCE, { id: after.id, before, after })
    const [removed, added] = changedLines(EVENT_SOURCE, source)
    expect(removed).toEqual(["          'Dana: You took Marcus.',"])
    expect(added).toEqual(["          'Dana: You beat Marcus.',"])
  })

  it('moves the comment with the condition it is about', () => {
    const before = event('poker-night')
    const after = event('poker-night')
    after.conditions = [after.conditions![1], after.conditions![0]]
    const { source, notes } = saveEvent(EVENT_SOURCE, { id: 'poker-night', before, after })
    const comment = source.indexOf('// He is only at his place from the afternoon on')
    const period = source.indexOf("{ kind: 'period', period: ['afternoon', 'evening', 'night'] },")
    const flag = source.indexOf("{ kind: 'flag', flag: 'wonPokerNight', set: false },")
    expect(comment).toBeGreaterThan(-1)
    expect(comment).toBeLessThan(period)
    expect(period).toBeLessThan(flag)
    expect(notes).toEqual(['reordered poker-night.conditions'])
    expect(syntaxErrors(source)).toEqual([])
  })

  it('rewraps a long description it changes, in the way the file wraps them', () => {
    const before = event('poker-night')
    const after = event('poker-night')
    after.about = "Marcus's Friday game, which starts the campaign. Everything is on the table and the winner takes the lot."
    const { source } = saveEvent(EVENT_SOURCE, { id: 'poker-night', before, after })
    expect(syntaxErrors(source)).toEqual([])
    expect(readEvents(source)[0]).toMatchObject({ about: after.about })
    expect(source).toContain('    about:\n      "Marcus\'s Friday game, which starts the campaign.')
    const [, added] = changedLines(EVENT_SOURCE, source)
    for (const line of added) {
      expect(line.length).toBeLessThanOrEqual(100)
      expect(line).toMatch(/^ {6}["'].*["'](,| \+)$/)
    }
  })

  it('adds, removes and reorders actions', () => {
    const before = event('marcus-reminds-you')
    const after = event('marcus-reminds-you')
    after.actions = [
      { kind: 'playSound', sound: 'dialogue' },
      ...after.actions,
      { kind: 'giveCash', amount: -20 },
    ]
    const { source } = saveEvent(EVENT_SOURCE, { id: after.id, before, after })
    expect(syntaxErrors(source)).toEqual([])
    expect(source).toContain("      { kind: 'playSound', sound: 'dialogue' },\n")
    expect(source).toContain("      { kind: 'giveCash', amount: -20 },\n")
    expect(sameValue(readEvents(source)[1], after)).toBe(true)
  })

  it('changes the trigger and drops the conditions', () => {
    const before = event('dana-takes-your-measure')
    const after = event('dana-takes-your-measure')
    after.trigger = { kind: 'standOn', areaId: 'laundromat', col: 4, row: 4 }
    delete after.conditions
    const { source } = saveEvent(EVENT_SOURCE, { id: after.id, before, after })
    expect(source).toContain("    trigger: { kind: 'standOn', areaId: 'laundromat', col: 4, row: 4 },\n")
    expect(source).not.toContain("conditions: [{ kind: 'flag', flag: 'wonPokerNight' }],")
  })

  it('creates a new event at the end of the list', () => {
    const fresh: GameEvent = {
      id: 'deb-says-hello',
      about: 'Deb notices you on the riverboat street.',
      trigger: { kind: 'talkTo', characterId: 'deb' },
      actions: [{ kind: 'dialogue', speaker: 'deb', lines: ['Deb: You again.'] }],
    }
    const { source } = saveEvent(EVENT_SOURCE, { id: fresh.id, after: fresh })
    expect(syntaxErrors(source)).toEqual([])
    const read = readEvents(source)
    expect(sameValue(read.at(-1), fresh)).toBe(true)
    expect(source).toContain(
      "  {\n    id: 'deb-says-hello',\n    about: 'Deb notices you on the riverboat street.',\n" +
        "    trigger: { kind: 'talkTo', characterId: 'deb' },\n" +
        "    actions: [\n      { kind: 'dialogue', speaker: 'deb', lines: ['Deb: You again.'] },\n    ],\n  },\n]",
    )
  })
})

describe('refusing rather than guessing', () => {
  it('refuses a character or event that is not there', () => {
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: 'nobody', before: {}, after: {} })).toThrow(PatchError)
    expect(() =>
      saveEvent(EVENT_SOURCE, { id: 'never-happens', before: { id: 'never-happens' }, after: { id: 'never-happens' } }),
    ).toThrow(PatchError)
  })

  it('refuses to overwrite a file that changed since the editor loaded it', () => {
    const stale = character('gus')
    stale.name = 'Gustav'
    const after = character('gus')
    after.style = 'Different.'
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: 'gus', before: stale, after })).toThrow(/changed underneath/)
  })

  it('refuses to create a character or event that already exists', () => {
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: 'gus', after: character('gus') })).toThrow(/already/)
    expect(() => saveEvent(EVENT_SOURCE, { id: 'poker-night', after: event('poker-night') })).toThrow(/already/)
  })

  it('refuses ids that would not be written as plain keys', () => {
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: "o'brien", after: {} })).toThrow(PatchError)
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: 'Gus', after: {} })).toThrow(PatchError)
    expect(() => saveEvent(EVENT_SOURCE, { id: 'Bad Id', after: { id: 'Bad Id' } })).toThrow(PatchError)
  })

  it('refuses to rename an event by saving it', () => {
    const before = event('poker-night')
    const after = { ...event('poker-night'), id: 'poker-night-2' }
    expect(() => saveEvent(EVENT_SOURCE, { id: 'poker-night', before, after })).toThrow(PatchError)
  })

  it('refuses a source where CHARACTERS cannot be found', () => {
    expect(() => saveCharacter('export const PEOPLE = {}', { id: 'gus', after: {} })).toThrow(/cannot find/)
  })

  it('refuses a value it cannot write', () => {
    const before = character('gus')
    const after = { ...character('gus'), seat: { skillTier: 'novice', stackMultiplier: Infinity } }
    expect(() => saveCharacter(CHARACTER_SOURCE, { id: 'gus', before, after })).toThrow(PatchError)
  })
})
