import { describe, expect, it } from 'vitest'
import { CHAR_FOR_TILE, TILE_VOCABULARY, parseMap, toSketch } from './tileRenderer'
import { AREAS } from '../world/cities'

describe('the tile vocabulary', () => {
  it('writes every tile with a character of its own', () => {
    const chars = TILE_VOCABULARY.map((entry) => entry.char)
    expect(chars).toEqual([...new Set(chars)])
    const tiles = TILE_VOCABULARY.map((entry) => entry.tile)
    expect(tiles).toEqual([...new Set(tiles)])
  })

  it('names every tile for a person', () => {
    for (const entry of TILE_VOCABULARY) {
      expect(entry.name.length, `tile ${entry.tile} has no name`).toBeGreaterThan(0)
      expect(CHAR_FOR_TILE[entry.tile]).toBe(entry.char)
    }
  })

  it('parses back exactly what it writes', () => {
    const sketch = TILE_VOCABULARY.map((entry) => entry.char).join('')
    expect(toSketch(parseMap(sketch))).toBe(sketch)
  })
})

describe('a map survives a trip through the editor', () => {
  // The editor loads a grid, lets you paint on it and writes a sketch back out.
  // If that round trip is not exact, opening a map and saving it unchanged would
  // quietly rewrite it — so every map in the game is checked, not a sample.
  it('is the same map coming back out as it was going in', () => {
    for (const [id, { area }] of Object.entries(AREAS)) {
      expect(parseMap(toSketch(area.map)), `${id} does not survive the round trip`).toEqual(area.map)
    }
  })

  it('keeps the shape it had', () => {
    for (const [id, { area }] of Object.entries(AREAS)) {
      const rows = toSketch(area.map).split('\n')
      expect(rows.length, `${id} changed height`).toBe(area.map.length)
      for (const row of rows) {
        expect(row.length, `${id} came back ragged`).toBe(area.map[0].length)
      }
    }
  })
})
