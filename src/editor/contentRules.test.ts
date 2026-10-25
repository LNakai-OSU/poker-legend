import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../world/characters'
import { EVENTS, type GameEvent } from '../world/events'
import { AREAS } from '../world/content'
import { isWalkable } from '../overworld/tileRenderer'
import { characterProblems, eventProblems, gameWorld } from './contentRules'
import {
  canonicalCharacter,
  canonicalEvent,
  characterIdFrom,
  characterShapeProblems,
  describeEvent,
  eventShapeProblems,
  type Names,
} from './contentModel'
import { sameValue } from './literal'

const world = gameWorld()
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const character = (id: string) => clone(CHARACTERS[id])
const event = (id: string) => clone(EVENTS.find((e) => e.id === id)!)

/** A tile in this area nobody can stand on. */
function wallIn(areaId: string) {
  const map = AREAS[areaId].area.map
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) if (!isWalkable(map, col, row)) return { col, row }
  }
  throw new Error(`no wall in ${areaId}`)
}

describe('the content as it stands', () => {
  // If these disagreed with the content tests, the editor would refuse to save
  // characters the game is happy with, or the other way round.
  it('finds nothing wrong with any character in the game', () => {
    for (const [id, c] of Object.entries(CHARACTERS)) {
      expect(characterProblems(id, clone(c), world), id).toEqual([])
    }
  })

  it('finds nothing wrong with any event in the game', () => {
    for (const e of EVENTS) expect(eventProblems(clone(e), e.id, world), e.id).toEqual([])
  })

  it('keeps every character and event the same when putting its keys in order', () => {
    for (const c of Object.values(CHARACTERS)) expect(sameValue(canonicalCharacter(clone(c)), clone(c))).toBe(true)
    for (const e of EVENTS) expect(sameValue(canonicalEvent(clone(e)), clone(e))).toBe(true)
  })

  it('writes the fields of an action in the order the file does', () => {
    const e = canonicalEvent({ ...event('poker-night'), actions: [{ lines: ['Hi.'], speaker: 'marcus', kind: 'dialogue' }] })
    expect(Object.keys(e.actions[0])).toEqual(['kind', 'speaker', 'lines'])
    expect(Object.keys(e)).toEqual(['id', 'about', 'trigger', 'conditions', 'actions'])
  })
})

describe('a scheduled character', () => {
  it('may not stand inside a wall', () => {
    const deb = character('deb')
    Object.assign(deb.overworld!.schedule[0], wallIn('rb-street'))
    expect(characterProblems('deb', deb, world).join('\n')).toMatch(/Deb stands in a wall in .* in the morning/)
  })

  it('may not stand on a fixture or in a doorway', () => {
    const area = AREAS['rb-street'].area
    const deb = character('deb')
    const poi = area.pois[0]
    deb.overworld!.schedule[0] = { ...deb.overworld!.schedule[0], col: poi.col, row: poi.row }
    expect(characterProblems('deb', deb, world).join('\n')).toContain(`Deb stands on ${poi.name}`)
  })

  it('may not be in two places at once', () => {
    const deb = character('deb')
    deb.overworld!.schedule[1].period = 'morning'
    expect(characterProblems('deb', deb, world)).toContain('Deb is in two places at once in the morning')
  })

  it('may not share a tile with somebody else at the same hour', () => {
    const mack = character('mack')
    mack.overworld!.schedule.push({ period: 'morning', areaId: 'rb-street', col: 9, row: 7 })
    expect(characterProblems('mack', mack, world).join('\n')).toContain('Mack and Deb stand on the same tile in the morning')
  })

  it('needs to be somewhere, and somewhere real', () => {
    const deb = character('deb')
    deb.overworld!.schedule = []
    expect(characterProblems('deb', deb, world).join('\n')).toMatch(/keeps no hours/)
    const lost = character('deb')
    lost.overworld!.schedule[0].areaId = 'atlantis'
    expect(characterProblems('deb', lost, world).join('\n')).toMatch(/"atlantis", which is not an area/)
  })

  it('cannot leave town while an event waits to talk to them', () => {
    const marcus = character('marcus')
    delete marcus.overworld
    expect(characterProblems('marcus', marcus, world).join('\n')).toMatch(/"poker-night" waits to talk to Marcus/)
  })
})

describe('a character at a table', () => {
  it('cannot stop playing while a table seats them', () => {
    const gus = character('gus')
    delete gus.seat
    expect(characterProblems('gus', gus, world).join('\n')).toMatch(/seats Gus, who no longer plays/)
  })

  it('cannot lose a persona a table uses', () => {
    const vance = character('vance')
    delete vance.personas
    expect(characterProblems('vance', vance, world).join('\n')).toMatch(/as "headsUp", which they no longer have/)
  })

  it('needs a style and something to say on sitting down', () => {
    const gus = character('gus')
    gus.style = ''
    delete gus.lines.greeting
    const problems = characterProblems('gus', gus, world).join('\n')
    expect(problems).toMatch(/no line under their name/)
    expect(problems).toMatch(/says nothing when you sit down/)
  })

  it('may not have an empty list of lines', () => {
    const gus = character('gus')
    gus.lines.call = []
    expect(characterProblems('gus', gus, world).join('\n')).toMatch(/lines.call has no lines/)
  })
})

describe('an event', () => {
  const fresh = (): GameEvent => ({
    id: 'mack-says-hello',
    about: 'Mack says hello on the riverboat street.',
    trigger: { kind: 'talkTo', characterId: 'mack' },
    actions: [{ kind: 'dialogue', speaker: 'mack', lines: ['Mack: Hello.'] }],
  })

  it('is fine when it is fine', () => {
    expect(eventProblems(fresh(), null, world)).toEqual([])
  })

  it('may not wait for somebody who does not exist, or is never in town', () => {
    const ghost = { ...fresh(), trigger: { kind: 'talkTo' as const, characterId: 'ghost' } }
    expect(eventProblems(ghost, null, world).join('\n')).toMatch(/"ghost", who does not exist/)
    const tiny = { ...fresh(), trigger: { kind: 'talkTo' as const, characterId: 'tiny' } }
    expect(eventProblems(tiny, null, world).join('\n')).toMatch(/Tiny, who is never out in the town/)
  })

  it('may not share a moment with another event without something to tell them apart', () => {
    const rival = { ...fresh(), trigger: { kind: 'talkTo' as const, characterId: 'dana' } }
    expect(eventProblems(rival, null, world).join('\n')).toMatch(/"dana-takes-your-measure" share a trigger/)
    // Dana has a beat in every chapter, so a new one needs the hour of the story as well.
    rival.conditions = [
      { kind: 'flag', flag: 'wonPokerNight', set: false },
      { kind: 'chapter', cityId: 'apartment' },
    ]
    expect(eventProblems(rival, null, world)).toEqual([])
  })

  it('may not name tables, areas or characters that do not exist', () => {
    const e = fresh()
    e.actions = [
      { kind: 'moveNpc', characterId: 'ghost', to: { col: 1, row: 1 } },
      { kind: 'teleport', areaId: 'atlantis', col: 1, row: 1 },
      { kind: 'dialogue', speaker: 'ghost', lines: ['Boo.'] },
      { kind: 'startTable', tableId: 'nowhere' },
    ]
    const problems = eventProblems(e, null, world).join('\n')
    expect(problems).toMatch(/moves "ghost"/)
    expect(problems).toMatch(/"atlantis", which is not an area/)
    expect(problems).toMatch(/spoken by "ghost"/)
    expect(problems).toMatch(/table "nowhere"/)
  })

  it('reports a blank line and everything else wrong at once', () => {
    const e = { ...fresh(), about: '' }
    e.actions = [{ kind: 'dialogue', speaker: 'deb', lines: [''] }]
    const problems = eventProblems(e, null, world).join('\n')
    expect(problems).toMatch(/lines\[0\] is empty/)
    expect(problems).toMatch(/say what this event is for/)
  })

  it('still answers when the shape is too wrong to check the rules', () => {
    const broken = { ...fresh(), trigger: null } as unknown as GameEvent
    expect(eventProblems(broken, null, world).join('\n')).toMatch(/is not a trigger/)
  })

  it('may not have dialogue with no lines', () => {
    const e = fresh()
    e.actions = [{ kind: 'dialogue', speaker: 'deb', lines: [] }]
    expect(eventProblems(e, null, world).join('\n')).toMatch(/has no lines/)
  })

  it('says when an action can never happen', () => {
    const e = fresh()
    e.actions = [{ kind: 'startTable', tableId: 'riverbend-mid' }, { kind: 'giveCash', amount: 5 }]
    expect(eventProblems(e, null, world)).toContain('step 2 never happens: sitting down at the table ends the event before it')
  })

  it('needs an id of its own and a reason to exist', () => {
    const e = { ...fresh(), id: 'poker-night', about: 'short' }
    const problems = eventProblems(e, null, world).join('\n')
    expect(problems).toMatch(/already called "poker-night"/)
    expect(problems).toMatch(/say what this event is for/)
  })

  it('keeps the first poker night a poker night', () => {
    const night = event('poker-night')
    night.actions = night.actions.filter((a) => a.kind !== 'startPokerNight')
    night.repeatable = true
    const problems = eventProblems(night, 'poker-night', world).join('\n')
    expect(problems).toMatch(/has to start the poker night/)
    expect(problems).toMatch(/cannot be played again/)
  })
})

describe('what the server believes', () => {
  it('turns away a character with keys or values it does not know', () => {
    expect(characterShapeProblems({ ...character('gus'), wings: true }).join()).toMatch(/"wings"/)
    expect(characterShapeProblems({ ...character('gus'), look: { ...character('gus').look, hairStyle: 'mohawk' } }).join()).toMatch(
      /hairStyle should be one of/,
    )
    expect(characterShapeProblems('gus')).toEqual(['character is not a character'])
  })

  it('turns away an event with an action it does not know', () => {
    const e = { ...event('poker-night'), actions: [{ kind: 'explode' }] }
    expect(eventShapeProblems(e).join()).toMatch(/actions\[0\].kind should be one of/)
    expect(eventShapeProblems({ ...event('poker-night'), trigger: { kind: 'talkTo', characterId: 'marcus', extra: 1 } }).join()).toMatch(
      /"extra"/,
    )
  })
})

describe('reading an event as a script', () => {
  const names: Names = {
    character: (id) => CHARACTERS[id]?.name ?? id,
    area: (id) => AREAS[id]?.area.name ?? id,
    table: (id) => id,
    poi: (id) => id,
    item: (id) => id,
    lesson: (id) => id,
    city: (id) => id,
  }

  it('reads the first poker night the way you would tell it', () => {
    const script = describeEvent(event('poker-night'), names).map((line) => (line.more ? `    ${line.text}` : line.text))
    expect(script[0]).toBe(
      'When you talk to Marcus, if you have not won the first poker night yet and it is afternoon, evening or night (once):',
    )
    expect(script[1]).toBe('Marcus says “You made it! Sit down, sit down.”')
    expect(script[2]).toBe('    “Everything on the table, winner takes the lot. That is the rule.”')
    expect(script[3]).toBe('    “You in?”')
    expect(script[4]).toBe('then the poker night starts')
  })
})

describe('naming a new character', () => {
  it('makes an id from a name', () => {
    expect(characterIdFrom('Wren')).toBe('wren')
    expect(characterIdFrom('Mary Ann')).toBe('maryAnn')
    expect(characterIdFrom("O'Brien")).toBe('obrien')
    expect(characterIdFrom('7 Seas')).toBe('c7Seas')
  })
})
