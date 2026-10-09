import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  PatchError,
  applyEdit,
  areasSharing,
  mapConstantOf,
  ownMapName,
} from './patchSource'
import { parseMap, toSketch } from '../overworld/tileRenderer'

/**
 * Tested against the real `cities.ts`, not a fixture.
 *
 * This code edits the file the whole game is built from. A fixture would prove
 * it handles the shapes I thought to write down; the real file is the only thing
 * that proves it handles the shapes that are actually in there — two quoting
 * styles for names, POIs written both as `local(...)` calls and as object
 * literals, and seventeen areas drawn from a map somebody else is also using.
 */
const SOURCE = readFileSync(new URL('../world/cities.ts', import.meta.url), 'utf8')

describe('finding things in the source', () => {
  it('knows which map an area is drawn from', () => {
    expect(mapConstantOf(SOURCE, 'bodega')).toBe('SHOP_ROOM')
    expect(mapConstantOf(SOURCE, 'basin')).toMatch(/^[A-Z][A-Z0-9_]*$/)
  })

  it('knows who else is drawn from the same map', () => {
    const sharing = areasSharing(SOURCE, 'SHOP_ROOM')
    expect(sharing).toContain('bodega')
    expect(sharing).toContain('laundromat')
    expect(sharing.length).toBeGreaterThan(2)
  })

  it('refuses an area that does not exist rather than guessing', () => {
    expect(() => mapConstantOf(SOURCE, 'nowhere')).toThrow(PatchError)
    expect(() => applyEdit(SOURCE, { areaId: 'nowhere', sketch: '###' })).toThrow(PatchError)
  })

  it('names an area its own map without colliding', () => {
    expect(ownMapName('bodega', [])).toBe('BODEGA_MAP')
    expect(ownMapName('marcus-house', [])).toBe('MARCUS_HOUSE_MAP')
    expect(ownMapName('bodega', ['BODEGA_MAP'])).toBe('BODEGA_MAP2')
  })
})

describe('redrawing a map', () => {
  const SKETCH = ['#####', '#...#', '#.D.#', '#####'].join('\n')

  it('replaces the map an area is drawn from', () => {
    const { source, notes } = applyEdit(SOURCE, { areaId: 'bodega', sketch: SKETCH })
    expect(source).toContain(`const SHOP_ROOM = parseMap(\`\n${SKETCH}\n\`)`)
    expect(notes.join(' ')).toContain('laundromat')
  })

  it('says out loud who else it just redrew', () => {
    // Eleven shops are the same room. Changing one changes all of them, and the
    // only unacceptable version of that is the one that happens quietly.
    const { notes } = applyEdit(SOURCE, { areaId: 'bodega', sketch: SKETCH })
    expect(notes[0]).toMatch(/also/)
  })

  it('leaves a map nobody shares without a warning', () => {
    const constant = mapConstantOf(SOURCE, 'basin')
    expect(areasSharing(SOURCE, constant)).toHaveLength(1)
    const { notes } = applyEdit(SOURCE, { areaId: 'basin', sketch: SKETCH })
    expect(notes[0]).not.toMatch(/also/)
  })

  it('splits a shared map into one of its own, leaving the others alone', () => {
    const { source, notes } = applyEdit(SOURCE, { areaId: 'bodega', sketch: SKETCH, split: true })
    expect(source).toContain(`const BODEGA_MAP = parseMap(\`\n${SKETCH}\n\`)`)
    // The shared one is untouched, and everybody else still uses it.
    const sharedBefore = /const SHOP_ROOM = parseMap\(`\n([\s\S]*?)\n`\)/.exec(SOURCE)![1]
    const sharedAfter = /const SHOP_ROOM = parseMap\(`\n([\s\S]*?)\n`\)/.exec(source)![1]
    expect(sharedAfter).toBe(sharedBefore)
    expect(areasSharing(source, 'SHOP_ROOM')).not.toContain('bodega')
    expect(areasSharing(source, 'SHOP_ROOM')).toContain('laundromat')
    expect(areasSharing(source, 'BODEGA_MAP')).toEqual(['bodega'])
    expect(notes.join(' ')).toContain('BODEGA_MAP')
  })

  it('writes a map that parses back to what was painted', () => {
    const grid = parseMap(SKETCH)
    const { source } = applyEdit(SOURCE, { areaId: 'basin', sketch: toSketch(grid) })
    const written = /const [A-Z_0-9]+ = parseMap\(`\n([\s\S]*?)\n`\)/.exec(
      source.slice(source.indexOf('const ' + mapConstantOf(SOURCE, 'basin'))),
    )![1]
    expect(parseMap(written)).toEqual(grid)
  })
})

describe('moving what stands on a map', () => {
  it('moves where the player arrives', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'bodega',
      markers: { start: { col: 9, row: 2 } },
    })
    expect(source).toMatch(/area\(\s*'bodega',[\s\S]{0,80}?\{ col: 9, row: 2 \}/)
    expect(notes.join(' ')).toContain('(9,2)')
  })

  it('moves a point of interest written as an object', () => {
    // The bus stop is a full literal, with an action and lines.
    const { source } = applyEdit(SOURCE, {
      areaId: 'depot',
      markers: { pois: [{ id: 'apartment-busstop', col: 3, row: 4 }] },
    })
    const call = /id: 'apartment-busstop',[\s\S]{0,120}/.exec(source)![0]
    expect(call).toContain('col: 3,')
    expect(call).toContain('row: 4,')
  })

  it('moves a point of interest written as a local() call', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'seventh',
      markers: { pois: [{ id: 'seventh-busker', col: 12, row: 13 }] },
    })
    expect(source).toMatch(/local\('seventh-busker', 'Busker', 12, 13,/)
    expect(notes.join(' ')).toContain('(12,13)')
  })

  it('moves a doorway by its sign', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'marcus-house',
      markers: { exits: [{ label: 'Outside', col: 4, row: 9 }] },
    })
    expect(source).toMatch(/\{ col: 4, row: 9, toAreaId: 'eastgate',[^}]*label: 'Outside' \}/)
    expect(notes.join(' ')).toContain('(4,9)')
  })

  it('refuses to move something it cannot find', () => {
    expect(() =>
      applyEdit(SOURCE, { areaId: 'bodega', markers: { pois: [{ id: 'ghost', col: 1, row: 1 }] } }),
    ).toThrow(PatchError)
    expect(() =>
      applyEdit(SOURCE, { areaId: 'bodega', markers: { exits: [{ label: 'Nowhere', col: 1, row: 1 }] } }),
    ).toThrow(PatchError)
  })

  it('only touches the area it was asked about', () => {
    // `local('seventh-busker', ...)` is unique, but the *shape* is not: every
    // street has locals written exactly the same way.
    const { source } = applyEdit(SOURCE, {
      areaId: 'seventh',
      markers: { pois: [{ id: 'seventh-busker', col: 12, row: 13 }] },
    })
    const changedLines = source
      .split('\n')
      .filter((line, i) => line !== SOURCE.split('\n')[i])
    expect(changedLines).toHaveLength(1)
    expect(changedLines[0]).toContain('seventh-busker')
  })
})

describe('doing nothing', () => {
  it('says so rather than rewriting the file', () => {
    const { source, notes } = applyEdit(SOURCE, { areaId: 'bodega' })
    expect(source).toBe(SOURCE)
    expect(notes).toEqual(['nothing changed'])
  })
})

describe('objects standing on a map', () => {
  it('records them where the game reads them from', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'basin',
      stamps: [
        { stampId: 'townhouse', col: 3, row: 12 },
        { stampId: 'fountain', col: 18, row: 7 },
      ],
    })
    expect(source).toContain("basin: [")
    expect(source).toContain("{ stampId: 'townhouse', col: 3, row: 12 },")
    expect(source).toContain("{ stampId: 'fountain', col: 18, row: 7 },")
    expect(notes.join(' ')).toContain('2 object(s)')
  })

  it('replaces the list rather than merging, so an object can be taken away', () => {
    const once = applyEdit(SOURCE, {
      areaId: 'basin',
      stamps: [
        { stampId: 'townhouse', col: 3, row: 12 },
        { stampId: 'fountain', col: 18, row: 7 },
      ],
    }).source
    const twice = applyEdit(once, { areaId: 'basin', stamps: [{ stampId: 'fountain', col: 18, row: 7 }] }).source
    expect(twice).not.toContain('townhouse')
    expect(twice).toContain("{ stampId: 'fountain', col: 18, row: 7 },")
  })

  it('clears the entry entirely when the last object is removed', () => {
    const once = applyEdit(SOURCE, { areaId: 'basin', stamps: [{ stampId: 'fountain', col: 1, row: 1 }] }).source
    const empty = applyEdit(once, { areaId: 'basin', stamps: [] }).source
    expect(empty).not.toContain("stampId: 'fountain'")
    expect(empty).toContain('AREA_STAMPS')
  })

  it('quotes an area id that is not a plain word', () => {
    const { source } = applyEdit(SOURCE, {
      areaId: 'marcus-house',
      stamps: [{ stampId: 'bar', col: 2, row: 2 }],
    })
    expect(source).toContain("'marcus-house': [")
  })
})

describe('wiring a stamp brings with it', () => {
  it('adds a dealer pointing at a real table', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'basin',
      addPois: [
        { id: 'basin-newtable', name: 'Dealer', col: 5, row: 5, action: 'table', target: 'silvercreek-low' },
      ],
    })
    expect(source).toMatch(
      /\{ id: 'basin-newtable', name: 'Dealer', col: 5, row: 5,[^}]*action: \{ kind: 'table', tableId: 'silvercreek-low' \} \}/,
    )
    expect(notes.join(' ')).toContain('added Dealer')
  })

  it('adds a doorway that leads somewhere real', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'basin',
      addExits: [{ col: 5, row: 15, toAreaId: 'bodega', toCol: 6, toRow: 5, label: 'Door' }],
    })
    expect(source).toContain(
      "{ col: 5, row: 15, toAreaId: 'bodega', toCol: 6, toRow: 5, label: 'Door' },",
    )
    expect(notes.join(' ')).toContain('Door')
  })

  it('adds to the right list, leaving the other alone', () => {
    const before = SOURCE.split('\n')
    const { source } = applyEdit(SOURCE, {
      areaId: 'basin',
      addExits: [{ col: 5, row: 15, toAreaId: 'bodega', toCol: 6, toRow: 5, label: 'Door' }],
    })
    const added = source.split('\n').filter((line) => !before.includes(line))
    expect(added).toHaveLength(1)
    expect(added[0]).toContain("label: 'Door'")
  })

  it('puts a house, its door and its record in with one edit', () => {
    const { source, notes } = applyEdit(SOURCE, {
      areaId: 'basin',
      stamps: [{ stampId: 'townhouse', col: 3, row: 12 }],
      addExits: [{ col: 5, row: 15, toAreaId: 'bodega', toCol: 6, toRow: 5, label: 'Front door' }],
    })
    expect(source).toContain("{ stampId: 'townhouse', col: 3, row: 12 },")
    expect(source).toContain("label: 'Front door' },")
    expect(notes.length).toBeGreaterThanOrEqual(2)
  })
})
